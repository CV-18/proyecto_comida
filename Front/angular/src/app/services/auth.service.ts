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
  private readonly API = `${environment.apiUrl}/auth`;

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

  private decodeToken(): Record<string, any> | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    const payload = this.decodeToken();
    if (!payload) return false;

    // El back mete los roles como array de strings: ["ROLE_ADMIN"]
    const roles = payload['roles'];
    if (Array.isArray(roles)) {
      return roles.some((r: any) =>
        r === 'ROLE_ADMIN' ||
        r === 'ADMIN' ||
        // Por si llega como objeto { authority: 'ROLE_ADMIN' }
        (typeof r === 'object' && r !== null && (r['authority'] === 'ROLE_ADMIN' || r['authority'] === 'ADMIN'))
      );
    }

    // Fallback: authorities como array de objetos Spring Security
    const authorities = payload['authorities'];
    if (Array.isArray(authorities)) {
      return authorities.some((a: any) =>
        a === 'ROLE_ADMIN' ||
        (typeof a === 'object' && a !== null && (a['authority'] === 'ROLE_ADMIN' || a['authority'] === 'ADMIN'))
      );
    }

    return false;
  }

  getTokenDebugInfo(): Record<string, any> | null {
    return this.decodeToken();
  }
}
