import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { TranslateService } from '../../services/translate.service';
import { UsuarioService, UsuarioResponse } from '../../services/usuario.service';

type AccountTab = 'perfil' | 'pedidos' | 'pagos';

@Component({
  selector: 'app-account',
  imports: [RouterLink],
  templateUrl: './account.html',
})
export class Account implements OnInit {
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
    private readonly usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.usuarioService.getMe().subscribe({
      next: (usuario) => {
        this.usuario = usuario;
        this.userService.updateUser({
          username: usuario.username,
          name: `${usuario.nombre} ${usuario.apellidos}`,
          email: usuario.email,
          address: usuario.direccion,
          phone: usuario.telefono,
        });
        this.userService.isPremium.set(usuario.isSuscriptor);
      },
      error: (err) => {
        console.error('No se pudo cargar el perfil', err);
      }
    });
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
    this.userService.updateUser(this.draft);
    this.isEditing = false;
  }
}
