import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import type { PlatoResponse } from './catalog-admin.service';

type PlatoApiResponse = PlatoResponse & {
  premium?: boolean;
};

type PlatoListResponse = PlatoResponse[] | {
  content?: PlatoApiResponse[];
  totalPages?: number;
  pageSize?: number;
};

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly API = `${environment.apiUrl}/v1/platos`;

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

  private normalizePlato(plato: PlatoApiResponse): PlatoResponse {
    return {
      ...plato,
      isPremium: plato.isPremium ?? plato.premium ?? false,
    };
  }
}
