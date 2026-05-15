import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PlatoResponse {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: 'DESAYUNO' | 'ALMUERZO' | 'MERIENDA' | 'CENA';
  categoria: 'ENTRANTE' | 'PRINCIPAL' | 'POSTRE';
  variante: 'ESTANDAR' | 'SIN_GLUTEN' | 'VEGANO' | 'PICANTE' | 'BAJO_CARBOHIDRATO';
  precio: number;
  cantidad: number;
}

export interface PlatoCreateRequest {
  nombre: string;
  descripcion: string;
  tipo: PlatoResponse['tipo'];
  categoria: PlatoResponse['categoria'];
  variante: PlatoResponse['variante'];
  precio: number;
  cantidad: number;
}

export interface PlatoUpdateRequest {
  nombre?: string;
  descripcion?: string;
  tipo?: PlatoResponse['tipo'];
  categoria?: PlatoResponse['categoria'];
  variante?: PlatoResponse['variante'];
  precio?: number;
  cantidad?: number;
}

export interface MenuCreateRequest {
  name: string;
  category: string;
  price: number;
  image?: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogAdminService {
  private readonly API = 'https://proyectocomidadc-gda6.onrender.com/v1/admin';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`
    });
  }

  listPlatos(): Observable<PlatoResponse[]> {
    return this.http.get<PlatoResponse[]>(`${this.API}/platos`, {
      headers: this.getHeaders()
    });
  }

  createPlato(payload: PlatoCreateRequest): Observable<PlatoResponse> {
    return this.http.post<PlatoResponse>(`${this.API}/platos`, payload, {
      headers: this.getHeaders()
    });
  }

  updatePlato(id: number, payload: PlatoUpdateRequest): Observable<PlatoResponse> {
    return this.http.put<PlatoResponse>(`${this.API}/platos/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  deletePlato(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/platos/${id}`, {
      headers: this.getHeaders()
    });
  }

  createMenu(payload: MenuCreateRequest): Observable<unknown> {
    return this.http.post(`${this.API}/menus`, payload, {
      headers: this.getHeaders()
    });
  }
}
