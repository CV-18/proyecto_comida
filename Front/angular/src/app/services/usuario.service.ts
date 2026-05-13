import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

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

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly API = 'https://proyectocomidadc-gda6.onrender.com/v1/usuarios';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`
    });
  }

  getMe(): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.API}/me`, {
      headers: this.getHeaders()
    });
  }
}
