import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { PlatoResponse } from './catalog-admin.service';

type PlatoListResponse = PlatoResponse[] | {
  content?: PlatoResponse[];
};

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly API = `${environment.apiUrl}/v1/platos`;

  constructor(private readonly http: HttpClient) {}

  listPlatos(): Observable<PlatoResponse[]> {
    return this.http.get<PlatoListResponse>(this.API).pipe(
      map((response) => Array.isArray(response) ? response : response.content ?? [])
    );
  }
}
