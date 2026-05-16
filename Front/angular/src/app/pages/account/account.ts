import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ViewChild } from '@angular/core';
import { UserService } from '../../services/user.service';
import { TranslateService } from '../../services/translate.service';
import { UsuarioService, UsuarioResponse } from '../../services/usuario.service';
import { PaymentModal } from '../../components/payment-modal/payment-modal';
import { PaymentMethod } from '../../models/payment.model';
import { AuthService } from '../../services/auth.service';

type AccountTab = 'perfil' | 'pedidos' | 'pagos' | 'admin';

@Component({
  selector: 'app-account',
  imports: [RouterLink, PaymentModal],
  templateUrl: './account.html',
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
    phone: '',
  };

  constructor(
    public userService: UserService,
    public translateService: TranslateService,
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    this.usuarioService.getMe().subscribe({
      next: (usuario) => {
        this.usuario = usuario;
        this.userService.syncAccessFromUsuario(usuario);
        this.userService.updateUser({
          username: usuario.username,
          name: `${usuario.nombre} ${usuario.apellidos}`.trim(),
          email: usuario.email,
          address: usuario.direccion,
          phone: usuario.telefono,
        });
        this.userService.isPremium.set(usuario.isSuscriptor ?? false);
        this.userService.premiumExpira.set(usuario.suscripcionExpira ?? null);
        this.userService.fetchPaymentMethods();
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
  }

  startEdit(): void {
    this.draft = {
      username: this.usuario?.username ?? '',
      name: this.usuario?.nombre ?? '',
      email: this.usuario?.email ?? '',
      address: this.usuario?.direccion ?? '',
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
          phone: usuario.telefono,
        });
        this.isEditing = false;
      },
      error: (err) => {
        console.error('No se pudo actualizar el perfil', err);
      }
    });
  }
}
