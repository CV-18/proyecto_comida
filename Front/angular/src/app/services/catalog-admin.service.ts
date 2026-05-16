import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

type PlatoRaw = Omit<PlatoResponse, 'isPremium'> & {
  isPremium?: boolean;
  premium?: boolean;
};

type PlatoListEnvelope = {
  content?: PlatoRaw[];
  totalPages?: number;
  size?: number;
};

type PlatoListResponse = PlatoRaw[] | PlatoListEnvelope;

export interface PlatoResponse {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: 'DESAYUNO' | 'ALMUERZO' | 'MERIENDA' | 'CENA';
  categoria: 'ENTRANTE' | 'PRINCIPAL' | 'POSTRE';
  pais: 'ESPANOL' | 'ITALIANO' | 'MEXICANO' | 'JAPONES' | 'INDIO' | 'GRIEGO';
  variante: 'ESTANDAR' | 'SIN_GLUTEN' | 'VEGANO' | 'PICANTE' | 'BAJO_CARBOHIDRATO';
  precio: number;
  cantidad: number;
  isPremium: boolean;
}

export interface PlatoCreateRequest {
  nombre: string;
  descripcion: string;
  tipo: PlatoResponse['tipo'];
  categoria: PlatoResponse['categoria'];
  pais: PlatoResponse['pais'];
  variante: PlatoResponse['variante'];
  precio: number;
  cantidad: number;
  isPremium?: boolean;
}

export interface PlatoUpdateRequest {
  nombre?: string;
  descripcion?: string;
  tipo?: PlatoResponse['tipo'];
  categoria?: PlatoResponse['categoria'];
  pais?: PlatoResponse['pais'];
  variante?: PlatoResponse['variante'];
  precio?: number;
  cantidad?: number;
  isPremium?: boolean;
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
  private readonly API = `${environment.apiUrl}/v1/platos`;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  /** Normaliza el campo premium/isPremium que el back puede devolver con cualquiera de los dos nombres */
  private normalize(raw: PlatoRaw): PlatoResponse {
    return {
      ...raw,
      isPremium: raw.isPremium ?? raw.premium ?? false,
    };
  }

  listPlatos(): Observable<PlatoResponse[]> {
    return this.http.get<PlatoListResponse>(`${this.API}?size=200`, {
      headers: this.getHeaders()
    }).pipe(
      map((response) => {
        const items: PlatoRaw[] = Array.isArray(response)
          ? response
          : (response.content ?? []);
        return items.map(p => this.normalize(p));
      })
    );
  }

  createPlato(payload: PlatoCreateRequest): Observable<PlatoResponse> {
    return this.http.post<PlatoRaw>(this.API, payload, {
      headers: this.getHeaders()
    }).pipe(map(p => this.normalize(p)));
  }

  updatePlato(id: number, payload: PlatoUpdateRequest): Observable<PlatoResponse> {
    return this.http.put<PlatoRaw>(`${this.API}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(map(p => this.normalize(p)));
  }

  deletePlato(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createMenu(payload: MenuCreateRequest): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/v1/menus`, payload, {
      headers: this.getHeaders()
    });
  }
}
