import { Component, ViewChild, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CartService } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { OrderService } from '../../services/order.service';
import { TranslateService } from '../../services/translate.service';
import { PaymentModal } from '../payment-modal/payment-modal';
import { AddressModalComponent } from '../address-modal/address-modal.component';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart-drawer',
  imports: [CurrencyPipe, TranslatePipe, PaymentModal, AddressModalComponent],
  templateUrl: './cart-drawer.html',
})
export class CartDrawer {
  @ViewChild(PaymentModal) paymentModal!: PaymentModal;
  @ViewChild(AddressModalComponent) addressModal!: AddressModalComponent;

  isProcessing = signal(false);
  errorMessage = signal<string | null>(null);
  selectedPaymentId = signal<number | null>(null);

  constructor(
    public cart: CartService,
    public userService: UserService,
    public translateService: TranslateService,
    private orderService: OrderService,
    private router: Router
  ) {}

  close(): void {
    this.cart.isCartOpen.set(false);
    this.errorMessage.set(null);
  }

  continueShopping(): void {
    this.close();
    void this.router.navigateByUrl('/platos');
  }

  onAddAddress(): void {
    // Se llama cuando se agrega una dirección desde el modal
    // Intentar de nuevo el checkout
    setTimeout(() => {
      this.checkout();
    }, 500);
  }

  checkout(): void {
    if (this.cart.items().length === 0 || this.isProcessing()) return;

    this.errorMessage.set(null);

    // Validar que el usuario tenga una dirección de envío (solo si está logeado)
    if (this.userService.isLoggedIn() && !this.userService.hasAddress()) {
      this.addressModal.open();
      return;
    }

    // Validar que el usuario tenga método de pago
    if (!this.userService.hasPaymentMethod()) {
      this.paymentModal.open();
      return;
    }

    // Elegir método de pago: usar selección local si existe, si no usar el predeterminado
    const chosenId = this.selectedPaymentId() ?? this.userService.defaultPaymentId();
    if (!chosenId) {
      this.errorMessage.set('Por favor, selecciona un método de pago predeterminado');
      return;
    }

    const totalAmount = this.cart.totalWithDiscount(
      this.userService.isPremium()
    );

    // Validar disponibilidad de fondos
    if (!this.userService.hasAvailableFunds(totalAmount)) {
      this.errorMessage.set(
        `Fondos insuficientes. Saldo disponible: ${this.translateService.formatCurrency(this.userService.getUserBalance())}`
      );
      return;
    }

    this.isProcessing.set(true);

    // Simular procesamiento del pago
    setTimeout(() => {
      // Descontar los fondos
      this.userService.deductFunds(totalAmount);

      const orderItems = this.cart.items().map((item) => ({
        dishId: item.id,
        name: item.name,
        quantity: item.quantity,
      }));

      // Obtener el método de pago predeterminado
      const defaultPayment = this.userService.paymentMethods().find((p) => p.id === chosenId);
      const paymentMethod = defaultPayment
        ? `${defaultPayment.tipo} terminada en ${defaultPayment.numeroTarjeta.slice(-4)}`
        : 'Método de pago no especificado';

      this.userService.createAndStoreOrder(
        orderItems,
        totalAmount,
        chosenId,
        {
          subtotal: this.cart.subtotal(),
          discount: this.cart.discountAmount(this.userService.isPremium()),
          shipping: this.cart.shippingFee(),
        }
      ).pipe(
        finalize(() => {
          this.isProcessing.set(false);
        })
      ).subscribe({
        next: (order) => {
          // Generar y descargar el PDF del ticket
          this.orderService.generateAndDownloadTicketPDF({
            orderId: order.id,
            orderUsername: order.username,
            date: new Date(),
            items: this.cart.items(),
            subtotal: this.cart.subtotal(),
            discount: this.cart.discountAmount(this.userService.isPremium()),
            shipping: this.cart.shippingFee(),
            total: totalAmount,
            user: this.userService.user(),
            paymentMethod: paymentMethod,
          });

          // Limpiar el carrito
          this.cart.clearCart();

          // Cerrar el drawer
          this.close();
        },
        error: () => {
          this.errorMessage.set('No se pudo registrar el pedido');
        }
      });
    }, 1000);
  }
}
