import { Injectable, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { MetodoPagoCreateRequest, MetodoPagoUpdateRequest, PaymentMethod } from '../models/payment.model';
import { Address, AddressCreateRequest, AddressUpdateRequest } from '../models/address.model';
import { AuthService } from './auth.service';
import { PaymentService } from './payment.service';
import { AddressService } from './address.service';
import { UsuarioResponse, UsuarioService } from './usuario.service';
import { BackendOrderResponse, BackendOrdersEnvelope, CreateOrderItemRequest, OrderBackendService } from './order-backend.service';

export interface OrderItem {
  platoId: number;
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  total: number;
  username: string;
  status: 'Entregado' | 'Enviado' | 'En camino' | 'En proceso' | 'Cancelado' | 'Completado' | 'Pendiente';
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

const ORDERS_STORAGE_PREFIX = 'orders_';

// Start with no saved payment methods; users can add them via UI

@Injectable({ providedIn: 'root' })
export class UserService {
  readonly isLoggedIn = signal(false);
  readonly isPremium = signal(false);
  readonly premiumExpira = signal<string | null>(null);
  readonly roles = signal<string[]>([]);
  readonly paymentMethods = signal<PaymentMethod[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly defaultPaymentId = signal<number | null>(null);
  readonly user = signal<UserProfile | null>(null);
  readonly currentUserId = signal<number | null>(null);
  readonly accounts = signal<StoredAccount[]>([]);
  readonly guestBalance = signal(100);
  readonly addresses = signal<Address[]>([]);
  readonly defaultAddressId = signal<number | null>(null);
  isNewUser = false;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
    private readonly addressService: AddressService,
    private readonly orderBackendService: OrderBackendService
  ) {
    this.isLoggedIn.set(this.authService.isLoggedIn());
    this.currentUserId.set(this.resolveAuthUserIdFromToken());
    this.loadOrdersFromStorage();
  }

  isAdminUser(): boolean {
    const user = this.user();
    return this.roles().includes('ROLE_ADMIN') || this.authService.isAdmin() || user?.username?.toLowerCase() === 'admin';
  }

  login(isNewUser = false): void {
    this.isLoggedIn.set(true);
    this.currentUserId.set(this.resolveAuthUserIdFromToken());
    this.isNewUser = isNewUser;
    this.loadOrdersFromStorage();

    if (this.isNewUser) {
      this.fetchPaymentMethods();
      this.fetchAddresses();
      this.fetchOrders();
      return;
    }

    // Sync Premium status from server and load payment methods + addresses
    this.refreshUserState().subscribe({
      next: () => {
        try {
          this.fetchPaymentMethods();
          this.fetchAddresses();
          this.fetchOrders();
        } catch {
          // ignore fetch errors
        }
      },
      error: () => {
        // if refresh fails, still load payment methods and addresses
        try {
          this.fetchPaymentMethods();
          this.fetchAddresses();
          this.fetchOrders();
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
    this.currentUserId.set(null);
    // clear sensitive user data
    this.paymentMethods.set([]);
    this.defaultPaymentId.set(null);
    this.orders.set([]);
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
        this.currentUserId.set(
          this.extractUserIdFromUsuario(usuario) ?? this.resolveAuthUserIdFromToken()
        );
        this.updateUser({
          username: usuario.username,
          name: `${usuario.nombre} ${usuario.apellidos}`.trim(),
          email: usuario.email,
          address: usuario.direccion,
          codigoPostal: usuario.codigoPostal,
          ciudad: usuario.ciudad,
          pais: usuario.pais,
          phone: usuario.telefono,
        });
        this.isPremium.set(usuario.isSuscriptor ?? false);
        this.premiumExpira.set(usuario.suscripcionExpira ?? null);
        this.loadOrdersFromStorage();
      })
    );
  }

  fetchOrders(): void {
    this.orderBackendService.listMine().pipe(
      map((payload) => this.extractBackendOrders(payload)),
      map((orders) => orders.map((backendOrder) => {
        const order = this.mapBackendOrder(backendOrder, [], 0);
        return order;
      }))
    ).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.persistOrdersToStorage();
      },
      error: () => {
        // keep current list if backend fetch fails
      },
    });
  }

  syncAccessFromUsuario(usuario: UsuarioResponse): void {
    this.roles.set(usuario.roles ?? []);
    if ((usuario.roles ?? []).length === 0 && usuario.username?.toLowerCase() === 'admin') {
      this.roles.set(['ROLE_ADMIN']);
    }
  }

  hydrateCurrentUserIdFromUsuario(usuario: UsuarioResponse): void {
    const userId = this.extractUserIdFromUsuario(usuario);
    if (userId !== null && userId > 0) {
      this.currentUserId.set(userId);
    }
  }

  cancelPremium(): void {
    this.isPremium.set(false);
  }

  addPaymentMethod(method: MetodoPagoCreateRequest): Observable<PaymentMethod> {
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
              saldoDisponible: updated.saldoDisponible ?? paymentMethod.saldoDisponible ?? 100,
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
    this.paymentService.remove(id).subscribe({
      next: () => this.updateLocalAfterRemove(id),
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
    this.paymentService.setDefault(id).subscribe({
      next: () => this.applyLocalDefault(id),
      error: () => this.applyLocalDefault(id),
    });
  }

  private applyLocalDefault(id: number): void {
    this.defaultPaymentId.set(id);
    this.paymentMethods.update((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  }

  updateLocalPaymentBalance(paymentMethodId: number, saldoDisponible: number): void {
    this.paymentMethods.update((prev) =>
      prev.map((paymentMethod) =>
        paymentMethod.id === paymentMethodId
          ? { ...paymentMethod, saldoDisponible }
          : paymentMethod
      )
    );
  }

  fetchPaymentMethods(): void {
    this.paymentService.list().subscribe({
      next: (list) => {
        const currentById = new Map(this.paymentMethods().map((paymentMethod) => [paymentMethod.id, paymentMethod]));
        const normalizedList = list.map((paymentMethod) => ({
          ...paymentMethod,
          saldoDisponible: paymentMethod.saldoDisponible ?? currentById.get(paymentMethod.id)?.saldoDisponible ?? 100,
        }));

        this.paymentMethods.set(normalizedList);
        const def = normalizedList.find((m) => m.isDefault) ?? normalizedList[0];
        this.defaultPaymentId.set(def ? def.id : null);
      },
      error: () => {
        // keep in-memory state if fetch fails
      }
    });
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

    if (data.username !== undefined) {
      this.loadOrdersFromStorage();
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

  createOrder(items: CreateOrderItemRequest[], total: number): Order {
    const username = this.user()?.username?.trim() || 'guest';

    const newOrder: Order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      total: total,
      username,
      status: 'Pendiente',
      items: items.map(item => ({ ...item, platoId: Number(item.platoId) })),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };

    this.orders.update((prev) => [newOrder, ...prev]);
    this.persistOrdersToStorage();
    return newOrder;
  }

  createAndStoreOrder(
    items: CreateOrderItemRequest[],
    total: number,
    paymentMethodId: number,
    pricing?: { subtotal?: number; discount?: number; shipping?: number }
  ): Observable<Order> {
    return this.orderBackendService.createCart({}).pipe(
      switchMap((cartResponse) => {
        const carritoId = Number(cartResponse.id ?? cartResponse.carritoId);

        const addItems$ = items.length > 0
          ? forkJoin(
            items.map((item) =>
              this.orderBackendService.addItemToCart(carritoId, {
                platoID: Number(item.platoId),
                cantidad: item.quantity,
              })
            )
          )
          : of([]);

        return addItems$.pipe(map(() => carritoId));
      }),
      switchMap((carritoId) => {
        return this.orderBackendService.create({
          carritoId,
          metodoPagoId: paymentMethodId,
        });
      }),
      switchMap((backendOrder) => {
        const orderId = backendOrder.id ?? backendOrder.codigo;
        if (!orderId) {
          return of(backendOrder);
        }
        return this.orderBackendService.updateStatus(orderId, 'Completado').pipe(
          map((updated) => ({ ...backendOrder, ...updated })),
          catchError(() => of(backendOrder))
        );
      }),
      map((backendOrder) => {
        const order = this.mapBackendOrder(backendOrder, items, total);
        return { ...order, status: 'Completado' as Order['status'] };
      }),
      tap((order) => {
        this.orders.update((prev) => [order, ...prev]);
        this.persistOrdersToStorage();
      })
    );
  }

  private mapBackendOrder(
    backendOrder: BackendOrderResponse,
    fallbackItems: CreateOrderItemRequest[],
    fallbackTotal: number
  ): Order {
    const username =
      (backendOrder.username ?? backendOrder.usuario ?? this.user()?.username ?? 'guest')
        .toString()
        .trim() || 'guest';

    const backendItems = Array.isArray(backendOrder.items) && backendOrder.items.length > 0
      ? backendOrder.items
      : backendOrder.pedidoItems;

    const orderItems: OrderItem[] = Array.isArray(backendItems) && backendItems.length > 0
      ? backendItems.map((item) => {
        const name = (item.nombrePlato ?? item.name ?? item.nombre ?? 'Producto').toString();
        const quantity = Number(item.quantity ?? item.cantidad ?? 1);
        const platoIdRaw = item.platoId ?? item.dishId ?? item.idPlato ?? item.id;
        return {
          platoId: Number(platoIdRaw),
          name,
          quantity: Number.isFinite(quantity) ? quantity : 1,
        };
      })
      : fallbackItems.map(item => ({ ...item, platoId: Number(item.platoId) }));

    const itemCountFromApi = Number(backendOrder.itemCount ?? backendOrder.cantidadItems);
    const itemCount = Number.isFinite(itemCountFromApi) && itemCountFromApi > 0
      ? itemCountFromApi
      : orderItems.length > 0
        ? orderItems.reduce((sum, item) => sum + item.quantity, 0)
        : fallbackItems.reduce((sum, item) => sum + item.quantity, 0);

    const date = (backendOrder.fechaPedido ?? backendOrder.date ?? backendOrder.fecha ?? new Date().toISOString()).toString();
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
    const normalized = status.trim().toLowerCase().replace(/\s+/g, '');
    if (normalized === 'entregado' || normalized === 'completado') return 'Completado';
    if (normalized === 'enviado') return 'Enviado';
    if (normalized === 'encamino') return 'En camino';
    if (normalized === 'enproceso') return 'En proceso';
    if (normalized === 'cancelado') return 'Cancelado';
    if (normalized === 'noenviado') return 'Pendiente';
    return 'Pendiente';
  }

  private extractBackendOrders(
    payload: BackendOrderResponse[] | BackendOrdersEnvelope
  ): BackendOrderResponse[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    const candidates = [payload.content, payload.items, payload.pedidos, payload.data, payload.results];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private extractUserIdFromUsuario(usuario: UsuarioResponse): number | null {
    return this.extractUserIdFromUnknown(usuario);
  }

  private resolveAuthUserIdFromToken(): number | null {
    const payload = this.authService.getTokenDebugInfo();
    if (!payload) {
      return null;
    }

    return this.extractUserIdFromUnknown(payload);
  }

  private resolveCurrentUserIdForCheckout(): Observable<number> {
    const fromState = this.currentUserId();
    if (fromState !== null && fromState > 0) {
      return of(fromState);
    }

    const fromToken = this.resolveAuthUserIdFromToken();
    if (fromToken !== null && fromToken > 0) {
      this.currentUserId.set(fromToken);
      return of(fromToken);
    }

    return this.usuarioService.getMe().pipe(
      map((usuario) => this.extractUserIdFromUsuario(usuario)),
      switchMap((usuarioId) => {
        if (usuarioId !== null && usuarioId > 0) {
          this.currentUserId.set(usuarioId);
          return of(usuarioId);
        }

        return throwError(() => new Error('USER_ID_UNAVAILABLE'));
      })
    );
  }

  private extractUserIdFromUnknown(value: unknown): number | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const queue: unknown[] = [value];
    const visited = new Set<object>();
    const idKeys = ['id', 'usuarioId', 'userId', 'idUsuario', 'uid', 'nameid'];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') {
        continue;
      }

      if (visited.has(current as object)) {
        continue;
      }

      visited.add(current as object);
      const record = current as Record<string, unknown>;

      for (const key of idKeys) {
        const raw = record[key];
        const numeric = Number(raw);
        if (Number.isFinite(numeric) && numeric > 0) {
          return numeric;
        }
      }

      for (const nested of Object.values(record)) {
        if (nested && typeof nested === 'object') {
          queue.push(nested);
        }
      }
    }

    return null;
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

  addAddress(address: AddressCreateRequest): Observable<UsuarioResponse> {
    return this.usuarioService.updateMe(address).pipe(
      tap((updatedUser) => {
        this.updateUser({
          address: updatedUser.direccion,
          codigoPostal: updatedUser.codigoPostal,
          ciudad: updatedUser.ciudad,
          pais: updatedUser.pais,
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

  private resolveOrdersStorageKey(): string {
    const currentUsername = this.user()?.username?.trim().toLowerCase();
    if (currentUsername) {
      return `${ORDERS_STORAGE_PREFIX}${currentUsername}`;
    }

    const payload = this.authService.getTokenDebugInfo();
    const tokenUsername = String(
      payload?.['username'] ?? payload?.['sub'] ?? payload?.['preferred_username'] ?? ''
    ).trim().toLowerCase();

    if (tokenUsername) {
      return `${ORDERS_STORAGE_PREFIX}${tokenUsername}`;
    }

    return `${ORDERS_STORAGE_PREFIX}guest`;
  }

  private loadOrdersFromStorage(): void {
    this.orders.set(this.readOrdersFromStorage());
  }

  private readOrdersFromStorage(): Order[] {
    try {
      const raw = localStorage.getItem(this.resolveOrdersStorageKey());
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistOrdersToStorage(): void {
    try {
      localStorage.setItem(this.resolveOrdersStorageKey(), JSON.stringify(this.orders()));
    } catch {
    }
  }

  getDefaultAddress(): Address | null {
    const addresses = this.addresses();
    if (addresses.length === 0) return null;
    const def = addresses.find(a => a.isDefault);
    return def || addresses[0];
  }
}
