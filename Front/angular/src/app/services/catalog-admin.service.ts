import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

type PlatoListEnvelope = {
  content?: PlatoResponse[];
  items?: PlatoResponse[];
  platos?: PlatoResponse[];
  data?: PlatoResponse[] | {
    content?: PlatoResponse[];
    items?: PlatoResponse[];
    platos?: PlatoResponse[];
    totalPages?: number;
    pageSize?: number;
    size?: number;
  };
  totalPages?: number;
  numberOfPages?: number;
  totalPage?: number;
  pageSize?: number;
  size?: number;
};

type PlatoListResponse = PlatoResponse[] | PlatoListEnvelope;

export interface PlatoResponse {
  id: number;
  nombre: string;
  descripcion: string;
  image?: string;
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
  private readonly API = `${environment.apiUrl}/admin`;
  private readonly API_PLATOS_PUBLIC = this.API.replace('/admin', '/platos');
  private readonly PLATO_IMAGE_PREFIX = 'plato_image_';

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

  listPlatos(): Observable<PlatoResponse[]> {
    return this.listPlatosFromUrl(this.API_PLATOS_PUBLIC, false).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status !== 401) {
          return this.listPlatosFromUrl(`${this.API}/platos`, false);
        }

        throw error;
      })
    );
  }

  createPlato(payload: PlatoCreateRequest): Observable<PlatoResponse> {
    return this.http.post<PlatoResponse>(`${this.API_PLATOS_PUBLIC}`, payload, {
      headers: this.getHeaders()
    });
  }

  updatePlato(id: number, payload: PlatoUpdateRequest): Observable<PlatoResponse> {
    const url = `${this.API_PLATOS_PUBLIC}/${id}`;
    return this.http.put<PlatoResponse>(url, payload, {
      headers: this.getHeaders()
    }).pipe(
      catchError((error: unknown) => {
        // Some backends expose PATCH instead of PUT for partial updates.
        if (!(error instanceof HttpErrorResponse) || (error.status !== 405 && error.status !== 404)) {
          throw error;
        }

        return this.http.patch<PlatoResponse>(url, payload, {
          headers: this.getHeaders()
        });
      })
    );
  }

  deletePlato(id: number): Observable<void> {
    return this.http.delete(`${this.API_PLATOS_PUBLIC}/${id}`, {
      headers: this.getHeaders(),
      responseType: 'text'
    }).pipe(map(() => void 0));
  }

  createMenu(payload: MenuCreateRequest): Observable<unknown> {
    return this.http.post(`${this.API}/menus`, payload, {
      headers: this.getHeaders()
    });
  }

  private listPlatosFromUrl(url: string, withAuth = true): Observable<PlatoResponse[]> {
    return this.http.get<PlatoListResponse>(url, {
      headers: withAuth ? this.getHeaders() : undefined
    }).pipe(
      switchMap((response) => {
        const firstPageData = this.extractPageData(response);

        if (firstPageData.totalPages <= 1) {
          return of(firstPageData.items);
        }

        const requests = Array.from({ length: firstPageData.totalPages - 1 }, (_, index) => {
          const page = index + 1;
          return this.http.get<PlatoListResponse>(this.buildPageUrl(url, page, firstPageData.pageSize), {
            headers: withAuth ? this.getHeaders() : undefined
          }).pipe(
            map((pageResponse) => this.extractPageData(pageResponse).items)
          );
        });

        return forkJoin(requests).pipe(map((pages) => [...firstPageData.items, ...pages.flat()]));
      })
    );
  }

  private extractPageData(response: PlatoListResponse): {
    items: PlatoResponse[];
    totalPages: number;
    pageSize: number;
  } {
    if (Array.isArray(response)) {
      const items = response.map((plato) => this.normalizePlato(plato));
      return {
        items,
        totalPages: 1,
        pageSize: items.length || 10,
      };
    }

    const nested = typeof response.data === 'object' && response.data !== null && !Array.isArray(response.data)
      ? response.data
      : null;

    const rawItems = response.content
      ?? response.items
      ?? response.platos
      ?? (Array.isArray(response.data) ? response.data : undefined)
      ?? nested?.content
      ?? nested?.items
      ?? nested?.platos
      ?? ((nested as Record<string, unknown> | null)?.['results'] as PlatoResponse[] | undefined)
      ?? ((response as Record<string, unknown>)['results'] as PlatoResponse[] | undefined)
      ?? [];

    const items = (Array.isArray(rawItems) ? rawItems : []).map((plato) => this.normalizePlato(plato));
    const totalPages = response.totalPages
      ?? response.numberOfPages
      ?? response.totalPage
      ?? nested?.totalPages
      ?? 1;
    const pageSize = response.pageSize
      ?? response.size
      ?? nested?.pageSize
      ?? nested?.size
      ?? (items.length || 10);

    return {
      items,
      totalPages: Math.max(1, Number(totalPages) || 1),
      pageSize: Math.max(1, Number(pageSize) || (items.length || 10)),
    };
  }

  private buildPageUrl(baseUrl: string, page: number, size: number): string {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${page}&size=${size}`;
  }

  private normalizePlato(plato: PlatoResponse): PlatoResponse {
    const backendImage = (plato as any).image
      ?? (plato as any).imageUrl
      ?? (plato as any).image_url
      ?? (plato as any).imagen
      ?? (plato as any).foto
      ?? (plato as any).picture
      ?? null;

    return {
      ...plato,
      isPremium: plato.isPremium ?? false,
      image: backendImage ?? this.getStoredImage(plato.id) ?? this.getDefaultImage(plato.pais),
    };
  }

  saveLocalImage(platoId: number, imageUrl?: string | null): void {
    const key = this.imageStorageKey(platoId);
    try {
      if (imageUrl && imageUrl.trim()) {
        localStorage.setItem(key, imageUrl.trim());
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore localStorage issues
    }
  }

  private getStoredImage(platoId: number): string | null {
    try {
      return localStorage.getItem(this.imageStorageKey(platoId));
    } catch {
      return null;
    }
  }

  private imageStorageKey(platoId: number): string {
    return `${this.PLATO_IMAGE_PREFIX}${platoId}`;
  }

  private getDefaultImage(pais: PlatoResponse['pais']): string {
    switch (pais) {
      case 'MEXICANO': return 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&fit=crop';
      case 'ITALIANO': return 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800&fit=crop';
      case 'JAPONES': return 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&fit=crop';
      case 'INDIO': return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&fit=crop';
      case 'GRIEGO': return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&fit=crop';
      case 'ESPANOL':
      default: return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Paella_negra.jpg/640px-Paella_negra.jpg';
    }
  }
}
