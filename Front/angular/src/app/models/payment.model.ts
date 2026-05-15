export type TipoMetodoPago = 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'PAYPAL';

export interface PaymentMethod {
  id: number;
  tipo: TipoMetodoPago;
  numeroTarjeta: string;
  nombreTitular?: string;
  fechaExpiracion: string;
  cvv?: string;
  isDefault: boolean;
  saldoDisponible: number;
}

export interface MetodoPagoCreateRequest {
  tipo: TipoMetodoPago;
  numeroTarjeta: string;
  nombreTitular: string;
  fechaExpiracion: string;
  cvv: string;
  isDefault?: boolean;
}

export interface MetodoPagoUpdateRequest {
  tipo?: TipoMetodoPago;
  numeroTarjeta?: string;
  nombreTitular?: string;
  fechaExpiracion?: string;
  cvv?: string;
  isDefault?: boolean;
}
