import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UsuarioResponse {
  id: number;
  nombre: string;
  apellidos: string;
  username: string;
  email: string;
  telefono: string;
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  pais: string;
  isSuscriptor: boolean;
}

export interface UsuarioUpdateRequest {
  nombre?: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigoPostal?: string;
  ciudad?: string;
  pais?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly API = `${environment.apiUrl}/v1/usuarios`;

  constructor(private readonly http: HttpClient) {}

  // El JWT lo añade automáticamente el interceptor — no hace falta HttpHeaders manual
  getMe(): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.API}/me`);
  }

  updateMe(data: UsuarioUpdateRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.API}/me`, data);
  }

  subscribePremium(): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.API}/me/suscribir`, {});
  }
}
