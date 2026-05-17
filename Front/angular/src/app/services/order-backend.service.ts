import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateOrderItemRequest {
  dishId?: string | number;
  name: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  total: number;
  paymentMethodId: number;
  subtotal?: number;
  discount?: number;
  shipping?: number;
}

export interface BackendOrderItem {
  dishId?: string | number;
  platoId?: string | number;
  idPlato?: string | number;
  id?: string | number;
  name?: string;
  quantity?: number;
  nombre?: string;
  cantidad?: number;
}

export interface BackendOrderResponse {
  id?: string | number;
  codigo?: string;
  date?: string;
  fecha?: string;
  total?: number;
  username?: string;
  usuario?: string;
  status?: string;
  estado?: string;
  items?: BackendOrderItem[];
  itemCount?: number;
  cantidadItems?: number;
}

@Injectable({ providedIn: 'root' })
export class OrderBackendService {
  private readonly API = `${environment.apiUrl}/pedidos`;

  constructor(private readonly http: HttpClient) {}

  create(request: CreateOrderRequest): Observable<BackendOrderResponse> {
    return this.http.post<BackendOrderResponse>(this.API, request);
  }
}
