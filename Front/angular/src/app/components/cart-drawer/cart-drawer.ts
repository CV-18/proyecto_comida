import { Component, ViewChild, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CartService } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { OrderService } from '../../services/order.service';
import { TranslateService } from '../../services/translate.service';
import { PaymentModal } from '../payment-modal/payment-modal';

@Component({
  selector: 'app-cart-drawer',
  imports: [CurrencyPipe, TranslatePipe, PaymentModal],
  templateUrl: './cart-drawer.html',
})
export class CartDrawer {
  @ViewChild(PaymentModal) paymentModal!: PaymentModal;

  isProcessing = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    public cart: CartService,
    public userService: UserService,
    public translateService: TranslateService,
    private orderService: OrderService
  ) {}

  close(): void {
    this.cart.isCartOpen.set(false);
    this.errorMessage.set(null);
  }

  checkout(): void {
    if (this.cart.items().length === 0 || this.isProcessing()) return;

    this.errorMessage.set(null);

    // Validar que el usuario tenga método de pago
    if (!this.userService.hasPaymentMethod()) {
      this.paymentModal.open();
      return;
    }

    // Validar que el usuario tenga un método de pago predeterminado
    if (!this.userService.hasDefaultPaymentMethod()) {
      this.errorMessage.set(
        'Por favor, selecciona un método de pago predeterminado'
      );
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

      // Crear la orden
      const order = this.userService.createOrder(
        this.cart.items().map((item) => ({
          name: item.name,
          quantity: item.quantity,
        })),
        totalAmount
      );

      // Obtener el método de pago predeterminado
      const defaultPayment = this.userService.paymentMethods().find(
        (p) => p.id === this.userService.defaultPaymentId()
      );
      const paymentMethod = defaultPayment
        ? `${defaultPayment.type.toUpperCase()} terminada en ${defaultPayment.last4}`
        : 'Método de pago no especificado';

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

      this.isProcessing.set(false);
    }, 1000);
  }
}
