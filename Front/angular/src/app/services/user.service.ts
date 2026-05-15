import { Injectable, signal } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';
import { MetodoPagoCreateRequest, MetodoPagoUpdateRequest, PaymentMethod } from '../models/payment.model';
import { AuthService } from './auth.service';
import { PaymentService } from './payment.service';
import { UsuarioResponse, UsuarioService } from './usuario.service';

export interface Order {
  id: string;
  date: string;
  total: number;
  username: string;
  status: 'Entregado' | 'En camino' | 'Cancelado' | 'Pendiente';
  items: string[];
  itemCount: number;
}

export interface UserProfile {
  username: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  memberSince: string;
  balance?: number; // Saldo disponible
}

interface StoredAccount extends UserProfile {
  password: string;
}

const mockOrders: Order[] = [
  {
    id: 'ORD-001234',
    date: '2026-04-28',
    total: 38.47,
    username: 'jose_doe',
    status: 'Entregado',
    items: ['Paella de Mariscos', 'Spaghetti Carbonara'],
    itemCount: 2,
  },
  {
    id: 'ORD-001198',
    date: '2026-04-15',
    total: 22.99,
    username: 'jose_doe',
    status: 'Entregado',
    items: ['Tacos al Pastor', 'Tarta de Chocolate Belga'],
    itemCount: 3,
  },
];

// Start with no saved payment methods; users can add them via UI

@Injectable({ providedIn: 'root' })
export class UserService {
  readonly isLoggedIn = signal(false);
  readonly isPremium = signal(false);
  readonly premiumExpira = signal<string | null>(null);
  readonly paymentMethods = signal<PaymentMethod[]>([]);
  readonly orders = signal<Order[]>(mockOrders);
  readonly defaultPaymentId = signal<number | null>(null);
  readonly user = signal<UserProfile | null>(null);
  readonly accounts = signal<StoredAccount[]>([]);
  readonly guestBalance = signal(100);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService
  ) {}

  isAdminUser(): boolean {
    return this.authService.isAdmin();
  }

  canManagePaymentMethods(): boolean {
    return !this.isAdminUser();
  }

  login(): void {
    this.isLoggedIn.set(true);
    // Sync Premium status from server and load payment methods
    this.refreshUserState().subscribe({
      next: () => {
        try {
          this.fetchPaymentMethods();
        } catch {
          // ignore fetch errors
        }
      },
      error: () => {
        // if refresh fails, still load payment methods
        try {
          this.fetchPaymentMethods();
        } catch {
          // ignore
        }
      }
    });
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.isPremium.set(false);
    this.premiumExpira.set(null);
    // clear sensitive user data
    this.paymentMethods.set([]);
    this.defaultPaymentId.set(null);
  }

  subscribePremium(paymentMethodId: number): Observable<UsuarioResponse> {
    return this.usuarioService.subscribePremium(paymentMethodId).pipe(
      tap((usuario) => {
        this.isPremium.set(usuario.isSuscriptor ?? true);
        this.premiumExpira.set(usuario.suscripcionExpira ?? null);
      })
    );
  }

  refreshUserState(): Observable<UsuarioResponse> {
    return this.usuarioService.getMe().pipe(
      tap((usuario) => {
        this.isPremium.set(usuario.isSuscriptor ?? false);
        this.premiumExpira.set(usuario.suscripcionExpira ?? null);
      })
    );
  }

  cancelPremium(): void {
    this.isPremium.set(false);
  }

  addPaymentMethod(method: MetodoPagoCreateRequest): Observable<PaymentMethod> {
    if (this.isAdminUser()) {
      return throwError(() => new Error('ADMIN_CANNOT_ADD_PAYMENT_METHODS'));
    }

    return this.paymentService.create(method).pipe(
      tap((created) => {
        this.paymentMethods.update((prev) => {
          const normalizedCreated: PaymentMethod = {
            ...created,
            saldoDisponible: created.saldoDisponible ?? 100,
          };
          const makeDefault = normalizedCreated.isDefault || prev.length === 0;
          const final = makeDefault ? { ...normalizedCreated, isDefault: true } : normalizedCreated;
          const updatedPrev = makeDefault
            ? prev.map((paymentMethod) => ({ ...paymentMethod, isDefault: false }))
            : prev;

          if (makeDefault) {
            this.defaultPaymentId.set(final.id);
          }

          return [...updatedPrev, final];
        });
      })
    );
  }

  updatePaymentMethod(id: number, method: MetodoPagoUpdateRequest): Observable<PaymentMethod> {
    if (this.isAdminUser()) {
      return throwError(() => new Error('ADMIN_CANNOT_EDIT_PAYMENT_METHODS'));
    }

    return this.paymentService.update(id, method).pipe(
      tap((updated) => {
        this.paymentMethods.update((prev) => {
          return prev.map((paymentMethod) => {
            if (paymentMethod.id !== id) {
              return paymentMethod;
            }

            return {
              ...paymentMethod,
              ...updated,
              saldoDisponible: paymentMethod.saldoDisponible ?? updated.saldoDisponible ?? 100,
            };
          });
        });

        if (updated.isDefault) {
          this.defaultPaymentId.set(updated.id);
          this.paymentMethods.update((prev) =>
            prev.map((paymentMethod) => ({
              ...paymentMethod,
              isDefault: paymentMethod.id === updated.id,
            }))
          );
        }
      })
    );
  }

  removePaymentMethod(id: number): void {
    if (this.isAdminUser()) {
      return;
    }

    this.paymentService.remove(id).subscribe({
      next: () => this.updateLocalAfterRemove(id),
      error: () => this.updateLocalAfterRemove(id),
    });
  }

  private updateLocalAfterRemove(id: number): void {
    this.paymentMethods.update((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      if (this.defaultPaymentId() === id) {
        if (filtered.length > 0) {
          const firstId = filtered[0].id;
          this.defaultPaymentId.set(firstId);
          return filtered.map((m, i) => ({ ...m, isDefault: i === 0 }));
        }
        this.defaultPaymentId.set(null);
      }
      return filtered;
    });
  }

  setDefaultPayment(id: number): void {
    if (this.isAdminUser()) {
      return;
    }

    this.paymentService.setDefault(id).subscribe({
      next: () => this.applyLocalDefault(id),
      error: () => this.applyLocalDefault(id),
    });
  }

  private applyLocalDefault(id: number): void {
    this.defaultPaymentId.set(id);
    this.paymentMethods.update((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  }

  fetchPaymentMethods(): void {
    this.paymentService.list().subscribe({
      next: (list) => {
        const currentById = new Map(this.paymentMethods().map((paymentMethod) => [paymentMethod.id, paymentMethod]));
        const normalizedList = list.map((paymentMethod) => ({
          ...paymentMethod,
          saldoDisponible: currentById.get(paymentMethod.id)?.saldoDisponible ?? paymentMethod.saldoDisponible ?? 100,
        }));

        const resolvedList = normalizedList.length > 0 || !this.isAdminUser()
          ? normalizedList
          : [this.createAdminPaymentMethod()];

        this.paymentMethods.set(resolvedList);
        const def = resolvedList.find((m) => m.isDefault) ?? resolvedList[0];
        this.defaultPaymentId.set(def ? def.id : null);
      },
      error: () => {
        // keep in-memory state if fetch fails
        if (this.isAdminUser() && this.paymentMethods().length === 0) {
          const adminMethod = this.createAdminPaymentMethod();
          this.paymentMethods.set([adminMethod]);
          this.defaultPaymentId.set(adminMethod.id);
        }
      }
    });
  }

  private createAdminPaymentMethod(): PaymentMethod {
    return {
      id: 0,
      tipo: 'TARJETA_CREDITO',
      numeroTarjeta: '0000000000000000',
      nombreTitular: 'ADMIN',
      fechaExpiracion: '12/99',
      cvv: '000',
      isDefault: true,
      saldoDisponible: 100000,
    };
  }

  updateUser(data: Partial<UserProfile>): void {
    const prev = this.user();
    if (prev) {
      this.user.set({ ...prev, ...data });
    } else {
      this.user.set({
        username: data.username ?? '',
        name: data.name ?? '',
        email: data.email ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        memberSince: new Date().getFullYear().toString(),
      });
      this.isLoggedIn.set(true);
    }
  }

  usernameExists(username: string): boolean {
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      return false;
    }

    return this.accounts().some((account) => account.username.toLowerCase() === normalizedUsername);
  }

  emailExists(email: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    return this.accounts().some((account) => account.email.toLowerCase() === normalizedEmail);
  }

  registerAccount(account: {
    username: string;
    name: string;
    email: string;
    phone: string;
    password: string;
  }): boolean {
    if (this.usernameExists(account.username) || this.emailExists(account.email)) {
      return false;
    }

    const storedAccount: StoredAccount = {
      username: account.username.trim(),
      name: account.name.trim(),
      email: account.email.trim(),
      address: '',
      phone: account.phone.trim(),
      memberSince: new Date().getFullYear().toString(),
      password: account.password,
    };

    this.accounts.update((prev) => [...prev, storedAccount]);
    this.user.set({
      username: storedAccount.username,
      name: storedAccount.name,
      email: storedAccount.email,
      address: storedAccount.address,
      phone: storedAccount.phone,
      memberSince: storedAccount.memberSince,
    });
    this.isLoggedIn.set(true);

    return true;
  }

  createOrder(items: { name: string; quantity: number }[], total: number): Order {
    const username = this.user()?.username?.trim() || 'guest';

    const newOrder: Order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      total: total,
      username,
      status: 'Pendiente',
      items: items.map((item) => `${item.name} x${item.quantity}`),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };

    this.orders.update((prev) => [newOrder, ...prev]);
    return newOrder;
  }

  hasPaymentMethod(): boolean {
    return this.paymentMethods().length > 0;
  }

  hasDefaultPaymentMethod(): boolean {
    return (
      this.paymentMethods().length > 0 && this.defaultPaymentId() !== null
    );
  }

  hasAvailableFunds(amount: number): boolean {
    const user = this.user();
    const balance = user?.balance ?? this.guestBalance();
    return balance >= amount;
  }

  deductFunds(amount: number): boolean {
    const user = this.user();
    if (!user) {
      const currentGuestBalance = this.guestBalance();
      if (currentGuestBalance < amount) return false;
      this.guestBalance.set(currentGuestBalance - amount);
      return true;
    }

    const currentBalance = user.balance ?? 0;
    if (currentBalance < amount) return false;

    const newBalance = currentBalance - amount;
    this.user.set({ ...user, balance: newBalance });
    return true;
  }

  addFunds(amount: number): void {
    const user = this.user();
    if (!user) return;

    const currentBalance = user.balance ?? 0;
    this.user.set({ ...user, balance: currentBalance + amount });
  }

  getUserBalance(): number {
    const user = this.user();
    return user?.balance ?? this.guestBalance();
  }
}
