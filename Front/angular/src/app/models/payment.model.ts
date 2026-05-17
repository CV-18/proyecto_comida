export type TipoMetodoPago = 'TARJETA_CREDITO' | 'TARJETA_DEBITO';

export interface PaymentMethod {
  id: number;
  tipo: TipoMetodoPago;
  numeroTarjeta: string;
  nombreTitular: string;
  fechaExpiracion: string;
  cvv: string;
  isDefault: boolean;
  saldoDisponible?: number;
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
  nombreTitular?: string;
  fechaExpiracion?: string;
  isDefault?: boolean;
}
