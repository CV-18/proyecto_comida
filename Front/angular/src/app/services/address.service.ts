import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Address, AddressCreateRequest, AddressUpdateRequest } from '../models/address.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly API = `${environment.apiUrl}/direcciones`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Address[]> {
    return this.http.get<Address[]>(this.API);
  }

  getOne(id: number): Observable<Address> {
    return this.http.get<Address>(`${this.API}/${id}`);
  }

  create(data: AddressCreateRequest): Observable<Address> {
    return this.http.post<Address>(this.API, data);
  }

  update(id: number, data: AddressUpdateRequest): Observable<Address> {
    return this.http.put<Address>(`${this.API}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  setDefault(id: number): Observable<Address> {
    return this.http.post<Address>(`${this.API}/${id}/default`, {});
  }
}
