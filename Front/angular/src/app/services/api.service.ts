import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Plato,
  UsuarioPerfil,
  MetodoPago,
  Pedido,
  CartItem,
  CartResponse,
  CheckoutPayload,
  CheckoutResponse
} from '../types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Platos
  getDishes(category?: string): Observable<Plato[]> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    return this.http.get<Plato[]>(`${this.baseUrl}/dishes`, { params });
  }

  getDish(id: string): Observable<Plato> {
    return this.http.get<Plato>(`${this.baseUrl}/dishes/${id}`);
  }

  // Usuario
  getUserProfile(): Observable<UsuarioPerfil> {
    return this.http.get<UsuarioPerfil>(`${this.baseUrl}/users/me`);
  }

  updateUserProfile(profile: Partial<UsuarioPerfil>): Observable<UsuarioPerfil> {
    return this.http.put<UsuarioPerfil>(`${this.baseUrl}/users/me`, profile);
  }

  // Métodos de pago
  getPaymentMethods(): Observable<MetodoPago[]> {
    return this.http.get<MetodoPago[]>(`${this.baseUrl}/payment-methods`);
  }

  addPaymentMethod(method: Omit<MetodoPago, 'id' | 'createdAt'>): Observable<MetodoPago> {
    return this.http.post<MetodoPago>(`${this.baseUrl}/payment-methods`, method);
  }

  deletePaymentMethod(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/payment-methods/${id}`);
  }

  setDefaultPaymentMethod(id: string): Observable<MetodoPago> {
    return this.http.patch<MetodoPago>(`${this.baseUrl}/payment-methods/${id}/set-default`, {});
  }

  // Pedidos
  getOrders(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.baseUrl}/orders`);
  }

  getOrder(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.baseUrl}/orders/${id}`);
  }

  createOrder(order: CheckoutPayload): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.baseUrl}/orders/checkout`, order);
  }

  updateOrderStatus(id: string, status: Pedido['status']): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.baseUrl}/orders/${id}`, { status });
  }

  // Carrito
  addToCart(item: { id: string; quantity: number }): Observable<CartResponse> {
    return this.http.post<CartResponse>(`${this.baseUrl}/cart/items`, item);
  }

  removeFromCart(itemId: string): Observable<CartResponse> {
    return this.http.delete<CartResponse>(`${this.baseUrl}/cart/items/${itemId}`);
  }

  updateCartItem(itemId: string, quantity: number): Observable<CartResponse> {
    return this.http.patch<CartResponse>(`${this.baseUrl}/cart/items/${itemId}`, { quantity });
  }

  clearCart(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/cart`);
  }

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(`${this.baseUrl}/cart`);
  }
}