import { Component, signal } from '@angular/core';
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
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './payment-modal.html',
  styleUrl: './payment-modal.css',
})
export class PaymentModal {
  isOpen = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  editingPaymentId = signal<number | null>(null);

  formData = {
    tipo: 'TARJETA_CREDITO' as TipoMetodoPago,
    numeroTarjeta: '',
    nombreTitular: '',
    fechaExpiracion: '',
    cvv: '',
  };

  constructor(private userService: UserService) {}

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
      error: () => {
        this.errorMessage.set('No se pudo guardar el método de pago');
        this.isSubmitting.set(false);
      },
    });
  }
}
