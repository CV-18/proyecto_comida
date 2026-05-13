import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [RouterLink, TranslatePipe, NgClass],
  templateUrl: './auth.html',
})
export class Auth implements OnInit {
  isLogin = true;
  isLoading = false;
  showPassword = false;
  formError = '';
  readonly passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  form = {
    username: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  constructor(
    private readonly router: Router,
    public userService: UserService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.syncModeFromUrl();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.syncModeFromUrl());
  }

  private syncModeFromUrl(): void {
    this.isLogin = !this.router.url.includes('/signup');
  }

  toggleMode(): void {
    void this.router.navigateByUrl(this.isLogin ? '/signup' : '/login');
  }

  updateField(
    field: 'username' | 'firstName' | 'lastName' | 'phone' | 'email' | 'password' | 'confirmPassword',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    this.form[field] = input.value;
    this.formError = '';
  }

  login(): void {
    this.formError = '';
    this.isLoading = true;

    if (this.isLogin) {
      this.authService.signIn({
        username: this.form.username,
        password: this.form.password
      }).subscribe({
        next: (res) => {
          this.authService.saveToken(res.token);
          this.userService.login();
          this.isLoading = false;
          void this.router.navigateByUrl('/cuenta');
        },
        error: () => {
          this.isLoading = false;
          this.formError = 'Usuario o contraseña incorrectos.';
        }
      });
      return;
    }

    const validationError = this.validateSignup();
    if (validationError) {
      this.formError = validationError;
      this.isLoading = false;
      return;
    }

    // Signup — pendiente de completar formulario con campos del backend
    this.isLoading = false;
    this.formError = 'El registro estará disponible próximamente.';
  }

  private validateSignup(): string | null {
    const username = this.form.username.trim();
    const firstName = this.form.firstName.trim();
    const lastName = this.form.lastName.trim();
    const phone = this.form.phone.trim();
    const email = this.form.email.trim();
    const password = this.form.password;
    const confirmPassword = this.form.confirmPassword;

    if (!username || !firstName || !lastName || !phone || !email || !password || !confirmPassword) {
      return 'Rellena todos los campos para crear la cuenta.';
    }

    if (!this.passwordPattern.test(password)) {
      return 'La contraseña debe tener al menos 8 caracteres, una letra y un número.';
    }

    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  }
}
