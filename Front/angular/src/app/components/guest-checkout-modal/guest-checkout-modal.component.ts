import { Component, EventEmitter, Output, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface GuestCheckoutData {
  email: string;
  address: {
    direccion: string;
    codigoPostal: string;
    ciudad: string;
    pais: string;
  };
  paymentMethod: {
    tipo: string;
    numeroTarjeta: string;
    fechaExpiracion: string;
    cvv: string;
  };
}

@Component({
  selector: 'app-guest-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './guest-checkout-modal.component.html',
  styleUrls: ['./guest-checkout-modal.component.css'],
})
export class GuestCheckoutModalComponent {
  @Output() onSubmit = new EventEmitter<GuestCheckoutData>();
  @ViewChild('modal') modalElement!: ElementRef;

  isOpen = signal(false);
  isProcessing = signal(false);
  formError = signal<string | null>(null);
  activeTab = signal<'address' | 'payment'>('address');

  addressForm = {
    email: '',
    direccion: '',
    codigoPostal: '',
    ciudad: '',
    pais: 'ESPANOL',
  };

  paymentForm = {
    tipo: 'CREDITO',
    numeroTarjeta: '',
    fechaExpiracion: '',
    cvv: '',
  };

  readonly countries = ['ESPANOL', 'MEXICANO', 'ITALIANO', 'FRANCES'];
  readonly cardTypes = ['CREDITO', 'DEBITO'];

  open(): void {
    this.isOpen.set(true);
    this.formError.set(null);
  }

  close(): void {
    this.isOpen.set(false);
    this.resetForms();
  }

  private resetForms(): void {
    this.addressForm = {
      email: '',
      direccion: '',
      codigoPostal: '',
      ciudad: '',
      pais: 'ESPANOL',
    };
    this.paymentForm = {
      tipo: 'CREDITO',
      numeroTarjeta: '',
      fechaExpiracion: '',
      cvv: '',
    };
    this.activeTab.set('address');
    this.formError.set(null);
  }

  switchTab(tab: 'address' | 'payment'): void {
    if (tab === 'payment' && !this.validateAddress()) {
      return;
    }
    this.activeTab.set(tab);
  }

  validateAddress(): boolean {
    const { email, direccion, codigoPostal, ciudad, pais } = this.addressForm;
    if (!email.trim() || !direccion.trim() || !codigoPostal.trim() || !ciudad.trim() || !pais) {
      this.formError.set('Por favor completa todos los campos de dirección');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.formError.set('Correo electrónico inválido');
      return false;
    }
    if (codigoPostal.length < 4) {
      this.formError.set('Código postal inválido');
      return false;
    }
    return true;
  }

  validatePayment(): boolean {
    const { numeroTarjeta, fechaExpiracion, cvv } = this.paymentForm;

    const cleanCardNumber = numeroTarjeta.replace(/\s/g, '');
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      this.formError.set('Número de tarjeta inválido (13-19 dígitos)');
      return false;
    }

    if (!/^\d{2}\/\d{2}$/.test(fechaExpiracion)) {
      this.formError.set('Fecha de vencimiento inválida (formato: MM/YY)');
      return false;
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      this.formError.set('CVV inválido (3-4 dígitos)');
      return false;
    }

    return true;
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\s/g, '');
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    this.paymentForm.numeroTarjeta = formatted;
  }

  formatExpiration(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    this.paymentForm.fechaExpiracion = value;
  }

  formatCVV(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.paymentForm.cvv = input.value.replace(/\D/g, '').slice(0, 4);
  }

  submit(): void {
    this.formError.set(null);

    if (!this.validateAddress() || !this.validatePayment()) {
      return;
    }

    this.isProcessing.set(true);

    setTimeout(() => {
      this.onSubmit.emit({
        email: this.addressForm.email,
        address: {
          direccion: this.addressForm.direccion,
          codigoPostal: this.addressForm.codigoPostal,
          ciudad: this.addressForm.ciudad,
          pais: this.addressForm.pais,
        },
        paymentMethod: {
          ...this.paymentForm,
          numeroTarjeta: this.paymentForm.numeroTarjeta.replace(/\s/g, ''),
        },
      });
      this.isProcessing.set(false);
      this.close();
    }, 500);
  }
}
