import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UserService, PaymentMethod } from '../../services/user.service';

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

  formData = {
    type: 'visa' as 'visa' | 'mastercard',
    cardNumber: '',
    holder: '',
    expiry: '',
    cvv: '',
  };

  constructor(private userService: UserService) {}

  open(): void {
    this.isOpen.set(true);
    this.resetForm();
    this.errorMessage.set(null);
  }

  close(): void {
    this.isOpen.set(false);
    this.resetForm();
    this.errorMessage.set(null);
  }

  private resetForm(): void {
    this.formData = {
      type: 'visa',
      cardNumber: '',
      holder: '',
      expiry: '',
      cvv: '',
    };
    this.isSubmitting.set(false);
  }

  submitPaymentMethod(): void {
    this.errorMessage.set(null);

    // Validaciones
    if (!this.formData.cardNumber.trim()) {
      this.errorMessage.set('El número de tarjeta es requerido');
      return;
    }

    if (this.formData.cardNumber.replace(/\s/g, '').length < 13) {
      this.errorMessage.set('El número de tarjeta no es válido');
      return;
    }

    if (!this.formData.holder.trim()) {
      this.errorMessage.set('El nombre del titular es requerido');
      return;
    }

    if (!this.formData.expiry.trim()) {
      this.errorMessage.set('La fecha de vencimiento es requerida');
      return;
    }

    if (!this.formData.cvv.trim() || this.formData.cvv.length < 3) {
      this.errorMessage.set('El CVV no es válido');
      return;
    }

    this.isSubmitting.set(true);

    // Simular validación de tarjeta
    setTimeout(() => {
      // Extraer últimos 4 dígitos
      const last4 = this.formData.cardNumber.replace(/\s/g, '').slice(-4);

      // Crear nuevo método de pago
      const newPaymentMethod: Omit<PaymentMethod, 'id'> = {
        type: this.formData.type,
        last4: last4,
        holder: this.formData.holder.toUpperCase(),
        expiry: this.formData.expiry,
        isDefault: true, // Guardar como predeterminado automáticamente
        color:
          this.formData.type === 'visa'
            ? 'from-blue-600 to-blue-800'
            : 'from-orange-600 to-amber-700',
      };

      // Agregar método de pago
      this.userService.addPaymentMethod(newPaymentMethod);

      // Cerrar modal
      this.close();
    }, 1000);
  }
}
