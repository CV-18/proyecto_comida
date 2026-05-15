import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  readonly passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

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
        error: (error) => {
          this.isLoading = false;
          this.formError = this.getBackendErrorMessage(error, 'Usuario o contraseña incorrectos.');
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

    this.authService.signUp({
      nombre: this.form.firstName,
      apellidos: this.form.lastName,
      username: this.form.username,
      email: this.form.email,
      password: this.form.password,
      passwordConfirm: this.form.confirmPassword,
      telefono: this.form.phone,
      direccion: '',
      codigoPostal: '',
      ciudad: '',
      pais: ''
    }).subscribe({
      next: (res) => {
        this.authService.saveToken(res.token);
        this.userService.login();
        this.isLoading = false;
        void this.router.navigateByUrl('/cuenta');
      },
      error: (error) => {
        this.isLoading = false;
        this.formError = this.getBackendErrorMessage(error, 'Error al crear la cuenta. Inténtalo de nuevo.');
      }
    });
  }

  private getBackendErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    const body = error.error;

    if (typeof body === 'string') {
      return body.trim() || fallback;
    }

    if (body && typeof body === 'object') {
      const details = body as Record<string, unknown>;
      const fieldMessages = [details['errors'], details['violations'], details['fieldErrors']]
        .flatMap((value) => this.collectErrorMessages(value));

      if (fieldMessages.length > 0) {
        return fieldMessages.join(' ');
      }

      const directMessages = [details['message'], details['errorMessage'], details['detail'], details['title'], details['error']]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

      if (directMessages.length > 0) {
        return directMessages[0];
      }
    }

    return fallback;
  }

  private collectErrorMessages(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }

        if (!item || typeof item !== 'object') {
          return '';
        }

        const record = item as Record<string, unknown>;
        const message = record['message'] ?? record['defaultMessage'] ?? record['reason'];
        return typeof message === 'string' ? message.trim() : '';
      })
      .filter((message): message is string => message.length > 0);
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
      return 'La contraseña debe tener al menos 10 caracteres, una letra y un número.';
    }

    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  }
}
