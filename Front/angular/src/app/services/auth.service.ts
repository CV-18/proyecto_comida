// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  nombre: string;
  apellidos: string;
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  telefono: string;
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  pais: string;
}

export interface JwtAuthResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/v1/auth`;

  constructor(private readonly http: HttpClient) {}

  signIn(request: SignInRequest): Observable<JwtAuthResponse> {
    return this.http.post<JwtAuthResponse>(`${this.API}/signin`, request);
  }

  signUp(request: SignUpRequest): Observable<JwtAuthResponse> {
    return this.http.post<JwtAuthResponse>(`${this.API}/signup`, request);
  }

  saveToken(token: string): void {
    localStorage.setItem('jwt_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  removeToken(): void {
    localStorage.removeItem('jwt_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Decodifica el payload del JWT (sin librería externa)
  private decodeToken(): Record<string, any> | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      // atob no entiende base64url, hay que convertir
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    const payload = this.decodeToken();
    if (!payload) return false;

    // Spring Security mete los roles en 'roles' o en 'authorities'
    const roles: string[] =
      payload['roles'] ?? payload['authorities'] ?? [];

    return roles.includes('ROLE_ADMIN');
  }
}
