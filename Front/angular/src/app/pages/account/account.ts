import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { TranslateService } from '../../services/translate.service';
import { UsuarioService, UsuarioResponse } from '../../services/usuario.service';
import { PaymentModal } from '../../components/payment-modal/payment-modal';
import { PaymentMethod } from '../../models/payment.model';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { CartService } from '../../services/cart.service';
import type { Order, OrderItem } from '../../services/user.service';
import { CommonModule } from '@angular/common';

type AccountTab = 'perfil' | 'pedidos' | 'pagos' | 'admin';

@Component({
  selector: 'app-account',
  imports: [RouterLink, PaymentModal, CommonModule],
  templateUrl: './account.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account implements OnInit {
  @ViewChild(PaymentModal) paymentModal!: PaymentModal;

  activeTab: AccountTab = 'perfil';
  isEditing = false;
  usuario: UsuarioResponse | null = null;
  draft = {
    username: '',
    name: '',
    email: '',
    address: '',
    codigoPostal: '',
    ciudad: '',
    pais: '',
    phone: '',
  };
  reorderMessage = '';
  reorderMessageType: 'success' | 'error' = 'success';

  constructor(
    public userService: UserService,
    public translateService: TranslateService,
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
    private readonly catalogService: CatalogService,
    private readonly cartService: CartService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    if (this.userService.isNewUser) {
      const user = this.userService.user();
      if (user) {
        this.usuario = {
          username: user.username,
          nombre: user.name.split(' ')[0] ?? '',
          apellidos: user.name.split(' ').slice(1).join(' '),
          email: user.email,
          telefono: user.phone,
          direccion: user.address,
          codigoPostal: user.codigoPostal,
          ciudad: user.ciudad,
          pais: user.pais,
          roles: [],
          isSuscriptor: false,
          suscripcionExpira: null,
        };
      }
      this.activeTab = 'perfil';
      this.userService.isNewUser = false;
      return;
    }

    this.usuarioService.getMe().subscribe({
      next: (usuario) => {
        this.usuario = usuario;
        this.userService.hydrateCurrentUserIdFromUsuario(usuario);
        this.userService.syncAccessFromUsuario(usuario);
        this.userService.updateUser({
          username: usuario.username,
          name: `${usuario.nombre} ${usuario.apellidos}`.trim(),
          email: usuario.email,
          address: usuario.direccion,
          codigoPostal: usuario.codigoPostal,
          ciudad: usuario.ciudad,
          pais: usuario.pais,
          phone: usuario.telefono,
        });
        this.userService.isPremium.set(usuario.isSuscriptor ?? false);
        this.userService.premiumExpira.set(usuario.suscripcionExpira ?? null);
        this.userService.fetchPaymentMethods();
        this.userService.fetchOrders();
      },
      error: (err) => {
        console.error('No se pudo cargar el perfil', err);
      }
    });
  }

  openAddPaymentModal(): void {
    this.paymentModal.openForCreate();
  }

  openEditPaymentModal(paymentMethod: PaymentMethod): void {
    this.paymentModal.openForEdit(paymentMethod);
  }

  deletePaymentMethod(paymentMethod: PaymentMethod): void {
    this.userService.removePaymentMethod(paymentMethod.id);
  }

  setTab(tab: AccountTab): void {
    this.activeTab = tab;
    if (tab === 'pedidos') {
      this.userService.fetchOrders();
    }
    if (tab !== 'pedidos') {
      this.reorderMessage = '';
    }
  }

  repeatOrder(order: Order): void {
    const requested = this.extractRequestedItems(order.items);
    if (requested.length === 0) {
      this.reorderMessageType = 'error';
      this.reorderMessage = 'No se pudo reutilizar este pedido.';
      return;
    }

    this.catalogService.listPlatos().subscribe({
      next: (platos) => {
        const byId = new Map(
          platos.map((plato) => [String(plato.id), plato] as const)
        );
        const byName = new Map(
          platos.map((plato) => [this.normalizeText(plato.nombre), plato] as const)
        );

        let added = 0;
        let missing = 0;
        let premiumBlocked = 0;

        for (const item of requested) {
          const plato = (item.platoId ? byId.get(String(item.platoId)) : undefined)
            ?? byName.get(this.normalizeText(item.name));
          if (!plato) {
            missing += 1;
            continue;
          }

          if (plato.isPremium && !this.userService.isPremium()) {
            premiumBlocked += 1;
            continue;
          }

          this.cartService.addItem({
            id: String(plato.id),
            name: plato.nombre,
            price: plato.precio,
            quantity: item.quantity,
            image: plato.image ?? 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=1200&auto=format&fit=crop',
            isPremium: plato.isPremium,
          });
          added += 1;
        }

        if (added > 0) {
          this.cartService.isCartOpen.set(true);
          this.reorderMessageType = 'success';
          this.reorderMessage = `Pedido reutilizado: ${added} producto(s) añadido(s) al carrito.`;
          if (missing > 0 || premiumBlocked > 0) {
            this.reorderMessage += ` Omitidos: ${missing} no disponibles, ${premiumBlocked} premium.`;
          }
          return;
        }

        this.reorderMessageType = 'error';
        this.reorderMessage = 'No se pudo añadir ningún producto del pedido al carrito.';
      },
      error: () => {
        this.reorderMessageType = 'error';
        this.reorderMessage = 'No se pudo cargar el catálogo para repetir el pedido.';
      },
    });
  }

  private extractRequestedItems(items: OrderItem[]): { platoId: number, name: string, quantity: number }[] {
    return items
      .map((item) => ({
        platoId: item.platoId,
        name: item.name?.trim() ?? '',
        quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
      }))
      .filter((item) => item.name.length > 0);
  }

  private normalizeText(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  startEdit(): void {
    this.draft = {
      username: this.usuario?.username ?? '',
      name: this.usuario?.nombre ?? '',
      email: this.usuario?.email ?? '',
      address: this.usuario?.direccion ?? '',
      codigoPostal: this.usuario?.codigoPostal ?? '',
      ciudad: this.usuario?.ciudad ?? '',
      pais: this.usuario?.pais ?? '',
      phone: this.usuario?.telefono ?? '',
    };
    this.isEditing = true;
  }

  updateField(field: keyof typeof this.draft, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.draft[field] = input.value;
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  saveEdit(): void {
    const nombreCompleto = this.draft.name.trim().split(/\s+/).filter(Boolean);
    const nombre = nombreCompleto.shift() ?? '';
    const apellidos = nombreCompleto.join(' ');

    this.usuarioService.updateMe({
      username: this.draft.username,
      nombre,
      apellidos,
      email: this.draft.email,
      direccion: this.draft.address,
      codigoPostal: this.draft.codigoPostal,
      ciudad: this.draft.ciudad,
      pais: this.draft.pais,
      telefono: this.draft.phone,
    }).subscribe({
      next: (usuario) => {
        this.usuario = usuario;
        this.userService.syncAccessFromUsuario(usuario);
        this.userService.updateUser({
          username: usuario.username,
          name: `${usuario.nombre} ${usuario.apellidos}`.trim(),
          email: usuario.email,
          address: usuario.direccion,
          codigoPostal: usuario.codigoPostal,
          ciudad: usuario.ciudad,
          pais: usuario.pais,
          phone: usuario.telefono,
        });
        this.isEditing = false;
      },
      error: (err) => {
        console.error('No se pudo actualizar el perfil', err);
      }
    });
  }

  getDisplayName(): string {
    const fullName = `${this.usuario?.nombre ?? ''} ${this.usuario?.apellidos ?? ''}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }

    return this.userService.user()?.name?.trim() || this.usuario?.username || 'Usuario';
  }

  getDisplayEmail(): string {
    return this.usuario?.email || this.userService.user()?.email || 'Sin correo';
  }

  getMemberSinceLabel(): string {
    const fromUser = this.userService.user()?.memberSince?.trim();
    if (fromUser) {
      return fromUser;
    }

    const yearFromDate = this.usuario?.suscripcionExpira?.slice(0, 4);
    return yearFromDate || new Date().getFullYear().toString();
  }

  getInitials(): string {
    const source = this.getDisplayName();
    return source
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'US';
  }

  getOrderStatusClass(status: Order['status']): string {
    if (status === 'Entregado') {
      return 'bg-green-50 text-green-700 border-green-200';
    }

    if (status === 'Cancelado') {
      return 'bg-red-50 text-red-700 border-red-200';
    }

    if (status === 'En camino') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }

    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  getOrderItemsPreview(order: Order): string {
    if (!order.items || order.items.length === 0) {
      return 'Sin articulos';
    }

    const names = order.items.map((item) => item.name).filter((name) => name && name.trim().length > 0);
    if (names.length <= 2) {
      return names.join(', ');
    }

    return `${names.slice(0, 2).join(', ')} +${names.length - 2} mas`;
  }

  logout(): void {
    this.userService.logout();
    void this.router.navigateByUrl('/');
  }
}
