import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private readonly API = 'https://proyectocomidadc-gda6.onrender.com/v1/auth';

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
}
