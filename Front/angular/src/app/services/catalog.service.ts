import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import type { PlatoResponse } from './catalog-admin.service';

type PlatoListResponse = PlatoResponse[] | {
  content?: PlatoResponse[];
  totalPages?: number;
  pageSize?: number;
};

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly API = `${environment.apiUrl}/v1/platos`;
  private readonly PLATO_IMAGE_PREFIX = 'plato_image_';

  constructor(private readonly http: HttpClient) {}

  listPlatos(): Observable<PlatoResponse[]> {
    return this.http.get<PlatoListResponse>(this.API).pipe(
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
          return this.http.get<PlatoListResponse>(`${this.API}?page=${page}&size=${pageSize}`).pipe(
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

  private getStoredImage(platoId: number): string | null {
    try {
      return localStorage.getItem(`${this.PLATO_IMAGE_PREFIX}${platoId}`);
    } catch {
      return null;
    }
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
