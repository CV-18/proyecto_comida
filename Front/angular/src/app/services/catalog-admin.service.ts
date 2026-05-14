import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PlatoCreateRequest {
  name: string;
  country: string;
  price: number;
  image?: string;
  description: string;
  rating: number;
  isPremium: boolean;
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

  createPlato(payload: PlatoCreateRequest): Observable<unknown> {
    return this.http.post(`${this.API}/platos`, payload, {
      headers: this.getHeaders()
    });
  }

  createMenu(payload: MenuCreateRequest): Observable<unknown> {
    return this.http.post(`${this.API}/menus`, payload, {
      headers: this.getHeaders()
    });
  }
}
