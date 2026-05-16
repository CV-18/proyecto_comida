import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

type PlatoApiResponse = PlatoResponse & {
  premium?: boolean;
};

type PlatoListResponse = PlatoResponse[] | {
  content?: PlatoApiResponse[];
  totalPages?: number;
  pageSize?: number;
};

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
    return this.http.get<PlatoListResponse>(`${this.API}/platos`, {
      headers: this.getHeaders()
    }).pipe(
      switchMap((response) => {
        if (Array.isArray(response)) {
          return of(response.map((plato) => this.normalizePlato(plato)));
        }

        const firstPage = (response.content ?? []).map((plato) => this.normalizePlato(plato));
        const totalPages = response.totalPages ?? 1;

        if (totalPages <= 1) {
          return of(firstPage);
        }

        const pageSize = response.pageSize ?? (firstPage.length || 10);
        const requests = Array.from({ length: totalPages - 1 }, (_, index) => {
          const page = index + 1;
          return this.http.get<PlatoListResponse>(`${this.API}/platos?page=${page}&size=${pageSize}`, {
            headers: this.getHeaders()
          }).pipe(
            map((pageResponse) => {
              const pageItems = Array.isArray(pageResponse) ? pageResponse : pageResponse.content ?? [];
              return pageItems.map((plato) => this.normalizePlato(plato));
            })
          );
        });

        return forkJoin(requests).pipe(
          map((pages) => [...firstPage, ...pages.flat()])
        );
      })
    );
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

  private normalizePlato(plato: PlatoApiResponse): PlatoResponse {
    return {
      ...plato,
      isPremium: plato.isPremium ?? plato.premium ?? false,
    };
  }
}
