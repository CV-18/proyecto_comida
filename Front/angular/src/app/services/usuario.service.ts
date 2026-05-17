import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UsuarioResponse {
  nombre: string;
  apellidos: string;
  username: string;
  email: string;
  direccion: string;
  codigoPostal: string;
  telefono: string;
  ciudad: string;
  pais: string;
  roles: string[];
  isSuscriptor: boolean;
  suscripcionExpira: string | null;
}

export interface UsuarioUpdateRequest {
  nombre?: string;
  apellidos?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  direccion?: string;
  codigoPostal?: string;
  telefono?: string;
  ciudad?: string;
  pais?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly API = `${environment.apiUrl}/usuarios`;

  constructor(private readonly http: HttpClient) {}

  // El JWT lo añade automáticamente el interceptor — no hace falta HttpHeaders manual
  getMe(): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.API}/me`);
  }

  updateMe(data: UsuarioUpdateRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.API}/me`, data);
  }

  subscribePremium(paymentMethodId: number): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.API}/me/suscribir`, {
      metodosPagoId: paymentMethodId,
    });
  }

  cobrarMetodoPago(id: number, monto: number): Observable<{ saldoDisponible: number }> {
    return this.http.post<{ saldoDisponible: number }>(
      `${environment.apiUrl}/metodos-pago/${id}/cobrar`,
      { monto }
    );
  }
}
