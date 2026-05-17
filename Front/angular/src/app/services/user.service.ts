import { Injectable, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { MetodoPagoCreateRequest, MetodoPagoUpdateRequest, PaymentMethod } from '../models/payment.model';
import { Address, AddressCreateRequest, AddressUpdateRequest } from '../models/address.model';
import { AuthService } from './auth.service';
import { PaymentService } from './payment.service';
import { AddressService } from './address.service';
import { UsuarioResponse, UsuarioService } from './usuario.service';
import { BackendOrderResponse, OrderBackendService } from './order-backend.service';

export interface OrderItem {
  dishId?: string;
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  total: number;
  username: string;
  status: 'Entregado' | 'En camino' | 'Cancelado' | 'Pendiente';
  items: OrderItem[];
  itemCount: number;
}

export interface UserProfile {
  username: string;
  name: string;
  email: string;
  address: string;
  codigoPostal: string;
  ciudad: string;
  pais: string;
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
    items: [
      { name: 'Paella de Mariscos', quantity: 1 },
      { name: 'Spaghetti Carbonara', quantity: 1 },
    ],
    itemCount: 2,
  },
  {
    id: 'ORD-001198',
    date: '2026-04-15',
    total: 22.99,
    username: 'jose_doe',
    status: 'Entregado',
    items: [
      { name: 'Tacos al Pastor', quantity: 2 },
      { name: 'Tarta de Chocolate Belga', quantity: 1 },
    ],
    itemCount: 3,
  },
];

// Start with no saved payment methods; users can add them via UI

@Injectable({ providedIn: 'root' })
export class UserService {
  readonly isLoggedIn = signal(false);
  readonly isPremium = signal(false);
  readonly premiumExpira = signal<string | null>(null);
  readonly roles = signal<string[]>([]);
  readonly paymentMethods = signal<PaymentMethod[]>([]);
  readonly orders = signal<Order[]>(mockOrders);
  readonly defaultPaymentId = signal<number | null>(null);
  readonly user = signal<UserProfile | null>(null);
  readonly accounts = signal<StoredAccount[]>([]);
  readonly guestBalance = signal(100);
  readonly addresses = signal<Address[]>([]);
  readonly defaultAddressId = signal<number | null>(null);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
    private readonly addressService: AddressService,
    private readonly orderBackendService: OrderBackendService
  ) {}

  isAdminUser(): boolean {
    const user = this.user();
    return this.roles().includes('ROLE_ADMIN') || this.authService.isAdmin() || user?.username?.toLowerCase() === 'admin';
  }

  canManagePaymentMethods(): boolean {
    return !this.isAdminUser();
  }

  login(): void {
    this.isLoggedIn.set(true);
    // Sync Premium status from server and load payment methods + addresses
    this.refreshUserState().subscribe({
      next: () => {
        try {
          this.fetchPaymentMethods();
          this.fetchAddresses();
        } catch {
          // ignore fetch errors
        }
      },
      error: () => {
        // if refresh fails, still load payment methods and addresses
        try {
          this.fetchPaymentMethods();
          this.fetchAddresses();
        } catch {
          // ignore
        }
      }
    });
  }

  logout(): void {
    this.authService.removeToken();
    this.isLoggedIn.set(false);
    this.isPremium.set(false);
    this.premiumExpira.set(null);
    this.roles.set([]);
    this.user.set(null);
    // clear sensitive user data
    this.paymentMethods.set([]);
    this.defaultPaymentId.set(null);
    this.addresses.set([]);
    this.defaultAddressId.set(null);
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
        this.syncAccessFromUsuario(usuario);
        this.isPremium.set(usuario.isSuscriptor ?? false);
        this.premiumExpira.set(usuario.suscripcionExpira ?? null);
      })
    );
  }

  syncAccessFromUsuario(usuario: UsuarioResponse): void {
    this.roles.set(usuario.roles ?? []);
    if ((usuario.roles ?? []).length === 0 && usuario.username?.toLowerCase() === 'admin') {
      this.roles.set(['ROLE_ADMIN']);
    }
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
    if (this.isAdminUser()) {
      const adminMethod = this.createAdminPaymentMethod();
      this.paymentMethods.set([adminMethod]);
      this.defaultPaymentId.set(adminMethod.id);
      return;
    }

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
      id: -1,
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
        codigoPostal: data.codigoPostal ?? '',
        ciudad: data.ciudad ?? '',
        pais: data.pais ?? '',
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
      codigoPostal: '',
      ciudad: '',
      pais: '',
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
      codigoPostal: storedAccount.codigoPostal,
      ciudad: storedAccount.ciudad,
      pais: storedAccount.pais,
      phone: storedAccount.phone,
      memberSince: storedAccount.memberSince,
    });
    this.isLoggedIn.set(true);

    return true;
  }

  createOrder(items: OrderItem[], total: number): Order {
    const username = this.user()?.username?.trim() || 'guest';

    const newOrder: Order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      total: total,
      username,
      status: 'Pendiente',
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };

    this.orders.update((prev) => [newOrder, ...prev]);
    return newOrder;
  }

  createAndStoreOrder(
    items: OrderItem[],
    total: number,
    paymentMethodId: number,
    pricing?: { subtotal?: number; discount?: number; shipping?: number }
  ): Observable<Order> {
    return this.orderBackendService.create({
      items,
      total,
      paymentMethodId,
      subtotal: pricing?.subtotal,
      discount: pricing?.discount,
      shipping: pricing?.shipping,
    }).pipe(
      map((backendOrder) => this.mapBackendOrder(backendOrder, items, total)),
      tap((order) => {
        this.orders.update((prev) => [order, ...prev]);
      }),
      // Keep checkout functional while backend endpoint is being rolled out.
      catchError(() => of(this.createOrder(items, total)))
    );
  }

  private mapBackendOrder(
    backendOrder: BackendOrderResponse,
    fallbackItems: OrderItem[],
    fallbackTotal: number
  ): Order {
    const username =
      (backendOrder.username ?? backendOrder.usuario ?? this.user()?.username ?? 'guest')
        .toString()
        .trim() || 'guest';

    const orderItems: OrderItem[] = Array.isArray(backendOrder.items) && backendOrder.items.length > 0
      ? backendOrder.items.map((item) => {
          const name = (item.name ?? item.nombre ?? 'Producto').toString();
          const quantity = Number(item.quantity ?? item.cantidad ?? 1);
          const dishIdRaw = item.dishId ?? item.platoId ?? item.idPlato ?? item.id;
          return {
            dishId: dishIdRaw !== undefined && dishIdRaw !== null ? String(dishIdRaw) : undefined,
            name,
            quantity: Number.isFinite(quantity) ? quantity : 1,
          };
        })
      : fallbackItems;

    const itemCountFromApi = Number(backendOrder.itemCount ?? backendOrder.cantidadItems);
    const itemCount = Number.isFinite(itemCountFromApi) && itemCountFromApi > 0
      ? itemCountFromApi
      : fallbackItems.reduce((sum, item) => sum + item.quantity, 0);

    const date = (backendOrder.date ?? backendOrder.fecha ?? new Date().toISOString()).toString();
    const total = Number(backendOrder.total);
    const statusRaw = (backendOrder.status ?? backendOrder.estado ?? 'Pendiente').toString();

    return {
      id: (backendOrder.id ?? backendOrder.codigo ?? `ORD-${String(Date.now()).slice(-6)}`).toString(),
      date: date.includes('T') ? date.split('T')[0] : date,
      total: Number.isFinite(total) ? total : fallbackTotal,
      username,
      status: this.normalizeOrderStatus(statusRaw),
      items: orderItems,
      itemCount,
    };
  }

  private normalizeOrderStatus(status: string): Order['status'] {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'entregado') return 'Entregado';
    if (normalized === 'en camino') return 'En camino';
    if (normalized === 'cancelado') return 'Cancelado';
    return 'Pendiente';
  }

  hasPaymentMethod(): boolean {
    return this.paymentMethods().length > 0;
  }

  hasDefaultPaymentMethod(): boolean {
    return (
      this.paymentMethods().length > 0 && this.defaultPaymentId() !== null
    );
  }

  hasShippingAddress(): boolean {
    const user = this.user();
    return !!user
      && user.address.trim().length > 0
      && user.codigoPostal.trim().length > 0
      && user.ciudad.trim().length > 0
      && user.pais.trim().length > 0;
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

  // ==================== DIRECCIONES ====================

  addAddress(address: AddressCreateRequest): Observable<Address> {
    return this.addressService.create(address).pipe(
      tap((created) => {
        this.addresses.update((prev) => {
          const makeDefault = prev.length === 0 || !prev.some(a => a.isDefault);
          const final = makeDefault ? { ...created, isDefault: true } : created;
          const updatedPrev = makeDefault
            ? prev.map(a => ({ ...a, isDefault: false }))
            : prev;

          if (makeDefault) {
            this.defaultAddressId.set(final.id ?? null);
          }

          return [...updatedPrev, final];
        });
      })
    );
  }

  updateAddress(id: number, address: AddressUpdateRequest): Observable<Address> {
    return this.addressService.update(id, address).pipe(
      tap((updated) => {
        this.addresses.update((prev) =>
          prev.map(a => (a.id === id ? { ...a, ...updated } : a))
        );

        if (updated.isDefault) {
          this.defaultAddressId.set(id);
          this.addresses.update((prev) =>
            prev.map(a => ({ ...a, isDefault: a.id === id }))
          );
        }
      })
    );
  }

  removeAddress(id: number): void {
    this.addressService.delete(id).subscribe({
      next: () => this.updateLocalAfterAddressRemove(id),
      error: () => this.updateLocalAfterAddressRemove(id),
    });
  }

  private updateLocalAfterAddressRemove(id: number): void {
    this.addresses.update((prev) => {
      const filtered = prev.filter(a => a.id !== id);
      if (this.defaultAddressId() === id) {
        if (filtered.length > 0) {
          const firstId = filtered[0].id;
          this.defaultAddressId.set(firstId ?? null);
          return filtered.map((a, i) => ({ ...a, isDefault: i === 0 }));
        }
        this.defaultAddressId.set(null);
      }
      return filtered;
    });
  }

  setDefaultAddress(id: number): void {
    this.addressService.setDefault(id).subscribe({
      next: () => this.applyLocalDefaultAddress(id),
      error: () => this.applyLocalDefaultAddress(id),
    });
  }

  private applyLocalDefaultAddress(id: number): void {
    this.defaultAddressId.set(id);
    this.addresses.update((prev) => prev.map(a => ({ ...a, isDefault: a.id === id })));
  }

  fetchAddresses(): void {
    this.addressService.getAll().subscribe({
      next: (list) => {
        this.addresses.set(list);
        const def = list.find(a => a.isDefault) ?? list[0];
        this.defaultAddressId.set(def ? def.id ?? null : null);
      },
      error: () => {
        // keep in-memory state if fetch fails
      }
    });
  }

  hasAddress(): boolean {
    return this.addresses().length > 0;
  }

  getDefaultAddress(): Address | null {
    const addresses = this.addresses();
    if (addresses.length === 0) return null;
    const def = addresses.find(a => a.isDefault);
    return def || addresses[0];
  }
}
