import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UserService } from '../../services/user.service';
import {
  MetodoPagoCreateRequest,
  MetodoPagoUpdateRequest,
  PaymentMethod,
  TipoMetodoPago,
} from '../../models/payment.model';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './payment-modal.html',
  styleUrl: './payment-modal.css',
})
export class PaymentModal {
  isOpen = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  editingPaymentId = signal<number | null>(null);
  readonly paymentTypeOptions: { value: TipoMetodoPago; title: string; subtitle: string; accent: string }[] = [
    {
      value: 'TARJETA_CREDITO',
      title: 'Crédito',
      subtitle: 'Rápida y común',
      accent: 'from-amber-400 to-orange-500',
    },
    {
      value: 'TARJETA_DEBITO',
      title: 'Débito',
      subtitle: 'Cargo directo',
      accent: 'from-emerald-400 to-teal-500',
    },
  ];

  formData = {
    tipo: 'TARJETA_CREDITO' as TipoMetodoPago,
    numeroTarjeta: '',
    nombreTitular: '',
    fechaExpiracion: '',
    cvv: '',
  };

  constructor(private userService: UserService) {}

  get isEditMode(): boolean {
    return this.editingPaymentId() !== null;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar método de pago' : 'Añadir método de pago';
  }

  get modalSubtitle(): string {
    return this.isEditMode
      ? 'Ajusta los datos de tu método guardado.'
      : 'Guarda una tarjeta en segundos para pagar más rápido.';
  }

  get selectedPaymentTypeLabel(): string {
    switch (this.formData.tipo) {
      case 'TARJETA_DEBITO':
        return 'Débito';
      default:
        return 'Crédito';
    }
  }

  get cardPreviewNumber(): string {
    const digits = this.formData.numeroTarjeta.replace(/\D/g, '');
    if (!digits) return '•••• •••• •••• ••••';
    const groups = digits.match(/.{1,4}/g) ?? [digits];
    return groups.join(' ').padEnd(19, '•');
  }

  get cardPreviewName(): string {
    return this.formData.nombreTitular.trim().toUpperCase() || 'NOMBRE APELLIDO';
  }

  get cardPreviewExpiry(): string {
    return this.formData.fechaExpiracion.trim() || 'MM/AA';
  }

  open(): void {
    this.openForCreate();
  }

  openForCreate(): void {
    this.editingPaymentId.set(null);
    this.isOpen.set(true);
    this.resetForm();
    this.errorMessage.set(null);
  }

  openForEdit(paymentMethod: PaymentMethod): void {
    this.editingPaymentId.set(paymentMethod.id);
    this.isOpen.set(true);
    this.formData = {
      tipo: paymentMethod.tipo,
      numeroTarjeta: paymentMethod.numeroTarjeta,
      nombreTitular: paymentMethod.nombreTitular ?? '',
      fechaExpiracion: paymentMethod.fechaExpiracion,
      cvv: paymentMethod.cvv ?? '',
    };
    this.isSubmitting.set(false);
    this.errorMessage.set(null);
  }

  close(): void {
    this.isOpen.set(false);
    this.resetForm();
    this.errorMessage.set(null);
  }

  setPaymentType(tipo: TipoMetodoPago): void {
    this.formData.tipo = tipo;
  }

  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 19);
    const formatted = digits.match(/.{1,4}/g)?.join(' ') ?? digits;
    this.formData.numeroTarjeta = formatted;
    input.value = formatted;
  }

  onExpiryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length >= 3
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : digits;
    this.formData.fechaExpiracion = formatted;
    input.value = formatted;
  }

  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.formData.nombreTitular = input.value.toUpperCase();
    input.value = this.formData.nombreTitular;
  }

  private resetForm(): void {
    this.formData = {
      tipo: 'TARJETA_CREDITO',
      numeroTarjeta: '',
      nombreTitular: '',
      fechaExpiracion: '',
      cvv: '',
    };
    this.isSubmitting.set(false);
  }

  submitPaymentMethod(): void {
    this.errorMessage.set(null);

    const numeroTarjeta = this.formData.numeroTarjeta.replace(/\s/g, '');

    if (!numeroTarjeta) {
      this.errorMessage.set('El número de tarjeta es requerido');
      return;
    }

    if (!/^[0-9]{13,19}$/.test(numeroTarjeta)) {
      this.errorMessage.set('El número de tarjeta no es válido');
      return;
    }

    const nombreTitular = this.formData.nombreTitular.trim().toUpperCase();
    if (!nombreTitular) {
      this.errorMessage.set('El nombre del titular es requerido');
      return;
    }

    if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(this.formData.fechaExpiracion.trim())) {
      this.errorMessage.set('La fecha de vencimiento es requerida');
      return;
    }

    const cvv = this.formData.cvv.trim();
    if (!/^[0-9]{3,4}$/.test(cvv)) {
      this.errorMessage.set('El CVV no es válido');
      return;
    }

    this.isSubmitting.set(true);

    const paymentPayload: MetodoPagoCreateRequest | MetodoPagoUpdateRequest = {
      tipo: this.formData.tipo,
      numeroTarjeta,
      nombreTitular,
      fechaExpiracion: this.formData.fechaExpiracion.trim(),
      cvv,
      isDefault: this.editingPaymentId() === null ? true : undefined,
    };

    const request$ = this.editingPaymentId() === null
      ? this.userService.addPaymentMethod(paymentPayload as MetodoPagoCreateRequest)
      : this.userService.updatePaymentMethod(this.editingPaymentId() as number, paymentPayload as MetodoPagoUpdateRequest);

    request$.subscribe({
      next: () => this.close(),
      error: (error) => {
        this.errorMessage.set(this.getSaveErrorMessage(error));
        this.isSubmitting.set(false);
      },
    });
  }

  private getSaveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }

      if (body && typeof body === 'object') {
        const details = body as Record<string, unknown>;
        const message = [details['message'], details['errorMessage'], details['detail'], details['title'], details['error']]
          .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

        if (message) {
          return message;
        }
      }

      if (error.status === 400) {
        return 'La tarjeta no se ha podido guardar. Revisa el número, la fecha y el CVV.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'No tienes permisos para guardar este método de pago.';
      }
    }

    return 'No se pudo guardar el método de pago';
  }
}
