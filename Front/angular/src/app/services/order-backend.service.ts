import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateOrderItemRequest {
  platoId: number;
  name: string;
  quantity: number;
}

export interface CreateOrderRequest {
  carritoId: number;
  metodoPagoId: number;
}

export interface GuestCheckoutRequestDto {
  email: string;
  checkoutRequest: {
    carritoId: number;
  };
  direccion: {
    direccion: string;
    ciudad: string;
    codigoPostal: string;
    pais: string;
  };
  metodoPago: {
    tipo: string;
    numeroTarjeta: string;
    fechaExpiracion: string;
    cvv: string;
  };
  total: number;
}

export interface BackendOrderItem {
  dishId?: string | number;
  platoId?: string | number;
  idPlato?: string | number;
  id?: string | number;
  name?: string;
  quantity?: number;
  nombrePlato?: string;
  nombre?: string;
  cantidad?: number;
}

export interface BackendOrderResponse {
  id?: string | number;
  codigo?: string;
  date?: string;
  fecha?: string;
  fechaPedido?: string;
  total?: number;
  username?: string;
  usuario?: string;
  status?: string;
  estado?: string;
  items?: BackendOrderItem[];
  pedidoItems?: BackendOrderItem[];
  itemCount?: number;
  cantidadItems?: number;
}

export interface BackendOrdersEnvelope {
  content?: BackendOrderResponse[];
  items?: BackendOrderResponse[];
  pedidos?: BackendOrderResponse[];
  data?: BackendOrderResponse[];
  results?: BackendOrderResponse[];
}

export interface BackendCartResponse {
  id?: number;
  carritoId?: number;
}

export interface CreateCartRequest {
  [key: string]: never;
}

export interface AddCartItemRequest {
  platoID: number;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class OrderBackendService {
  private readonly API = `${environment.apiUrl}/pedidos`;
  private readonly CART_API = `${environment.apiUrl}/carritos`;

  constructor(private readonly http: HttpClient) {}

  create(request: CreateOrderRequest): Observable<BackendOrderResponse> {
    return this.http.post<BackendOrderResponse>(this.API, request);
  }

  listMine(): Observable<BackendOrderResponse[] | BackendOrdersEnvelope> {
    return this.http.get<BackendOrderResponse[] | BackendOrdersEnvelope>(this.API);
  }

  createGuestOrder(request: GuestCheckoutRequestDto): Observable<BackendOrderResponse> {
    return this.http.post<BackendOrderResponse>(`${this.API}/guest`, request);
  }

  createCart(request: CreateCartRequest = {}): Observable<BackendCartResponse> {
    return this.http.post<BackendCartResponse>(this.CART_API, request);
  }

  updateStatus(orderId: string | number, estado: string): Observable<BackendOrderResponse> {
    return this.http.patch<BackendOrderResponse>(`${this.API}/${orderId}`, { estado });
  }

  addItemToCart(cartId: number, request: AddCartItemRequest): Observable<BackendCartResponse> {
    return this.http.post<BackendCartResponse>(`${this.CART_API}/${cartId}/items`, request);
  }
}
