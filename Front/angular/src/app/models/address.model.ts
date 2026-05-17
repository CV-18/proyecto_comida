export interface Address {
  id?: number;
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  pais: string;
  isDefault?: boolean;
}

export interface AddressCreateRequest {
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  pais: string;
}

export interface AddressUpdateRequest extends AddressCreateRequest {
  isDefault?: boolean;
}
