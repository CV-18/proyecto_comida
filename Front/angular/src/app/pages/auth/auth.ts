import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, finalize, timeout } from 'rxjs/operators';
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
  readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  readonly phonePattern = /^[0-9+\-\s()]{9,}$/;

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

    // Validar signup o login
    const validationError = this.isLogin ? this.validateLogin() : this.validateSignup();
    if (validationError) {
      this.formError = validationError;
      return;
    }

    this.isLoading = true;

    if (this.isLogin) {
      this.authService.signIn({
        username: this.form.username,
        password: this.form.password
      }).pipe(
        timeout(10000),
        finalize(() => {
          this.isLoading = false;
        })
      ).subscribe({
        next: (res) => {
          this.authService.saveToken(res.token);
          this.userService.login();
          void this.router.navigateByUrl('/cuenta');
        },
        error: (error) => {
          // Asegurar que el spinner se apague y mostrar mensaje parseado
          this.isLoading = false;
          const backendMsg = error && (error as any).error && typeof (error as any).error === 'object' && (error as any).error.message;
          this.formError = (typeof backendMsg === 'string' && backendMsg.trim().length > 0)
            ? backendMsg
            : this.getBackendErrorMessage(error, 'Usuario o contraseña incorrectos.');
        }
      });
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
    }).pipe(
      timeout(10000),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (res) => {
        this.authService.saveToken(res.token);
        this.userService.login();
        void this.router.navigateByUrl('/cuenta');
      },
      error: (error) => {
        // Asegurar que el spinner se apague y mostrar mensaje parseado
        this.isLoading = false;
        const backendMsg = error && (error as any).error && typeof (error as any).error === 'object' && (error as any).error.message;
        this.formError = (typeof backendMsg === 'string' && backendMsg.trim().length > 0)
          ? backendMsg
          : this.getBackendErrorMessage(error, 'Error al crear la cuenta. Inténtalo de nuevo.');
      }
    });
  }

  private getBackendErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    // Si no hay body, retorna fallback
    if (!error.error) {
      return fallback;
    }

    let body: unknown = error.error;

    // Si el backend devuelve un string JSON, intentar parsearlo
    if (typeof body === 'string') {
      const trimmed = body.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          body = JSON.parse(trimmed);
        } catch {
          // no parseable, usar el string como mensaje
          return trimmed || fallback;
        }
      } else {
        return trimmed || fallback;
      }
    }

    if (body && typeof body === 'object') {
      const details = body as Record<string, unknown>;

      // Buscar mensajes en diferentes propiedades del error
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

  private validateLogin(): string | null {
    const username = this.form.username.trim();
    const password = this.form.password.trim();

    if (!username) {
      return 'Ingresa tu usuario o email.';
    }

    if (!password) {
      return 'Ingresa tu contraseña.';
    }

    return null;
  }

  private validateSignup(): string | null {
    const username = this.form.username.trim();
    const firstName = this.form.firstName.trim();
    const lastName = this.form.lastName.trim();
    const phone = this.form.phone.trim();
    const email = this.form.email.trim();
    const password = this.form.password;
    const confirmPassword = this.form.confirmPassword;

    if (!username) {
      return 'Ingresa un nombre de usuario.';
    }

    if (username.length < 3) {
      return 'El nombre de usuario debe tener al menos 3 caracteres.';
    }

    if (!firstName) {
      return 'Ingresa tu nombre.';
    }

    if (!lastName) {
      return 'Ingresa tus apellidos.';
    }

    if (!phone) {
      return 'Ingresa un número de teléfono.';
    }

    if (!this.phonePattern.test(phone)) {
      return 'El número de teléfono no es válido.';
    }

    if (!email) {
      return 'Ingresa tu correo electrónico.';
    }

    if (!this.emailPattern.test(email)) {
      return 'El correo electrónico no es válido.';
    }

    if (!password) {
      return 'Ingresa una contraseña.';
    }

    if (!confirmPassword) {
      return 'Confirma tu contraseña.';
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
