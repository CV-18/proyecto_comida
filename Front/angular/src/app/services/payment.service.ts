import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MetodoPagoCreateRequest, MetodoPagoUpdateRequest, PaymentMethod } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly API = `${environment.apiUrl}/v1/metodos-pago`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(this.API);
  }

  create(method: MetodoPagoCreateRequest): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.API, method);
  }

  update(id: number, method: MetodoPagoUpdateRequest): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.API}/${id}`, method);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  setDefault(id: number): Observable<void> {
    return this.http.post<void>(`${this.API}/${id}/default`, {});
  }
}
