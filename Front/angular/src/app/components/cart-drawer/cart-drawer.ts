import { Component, ViewChild, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CartService, type CartItem } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { OrderService } from '../../services/order.service';
import { TranslateService } from '../../services/translate.service';
import { PaymentModal } from '../payment-modal/payment-modal';
import { AddressModalComponent } from '../address-modal/address-modal.component';
import { finalize, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { UsuarioResponse, UsuarioService } from '../../services/usuario.service';
import { OrderBackendService, type CreateOrderItemRequest } from '../../services/order-backend.service';

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
    private usuarioService: UsuarioService,
    public translateService: TranslateService,
    private orderService: OrderService,
    private orderBackendService: OrderBackendService,
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

  onAddAddress(updatedUser: UsuarioResponse): void {
    this.userService.updateUser({
      address: updatedUser.direccion,
      codigoPostal: updatedUser.codigoPostal,
      ciudad: updatedUser.ciudad,
      pais: updatedUser.pais,
    });

    setTimeout(() => {
      this.checkout();
    }, 500);
  }

  checkout(): void {
    if (this.cart.items().length === 0 || this.isProcessing()) return;

    this.errorMessage.set(null);

    if (!this.userService.isLoggedIn()) {
      this.router.navigate(['/login']);
      this.close();
      return;
    }

    if (!this.userService.hasShippingAddress()) {
      this.addressModal.open();
      return;
    }

    if (!this.userService.hasPaymentMethod()) {
      this.paymentModal.open();
      return;
    }

    const chosenId = this.selectedPaymentId() ?? this.userService.defaultPaymentId();
    if (!chosenId) {
      this.errorMessage.set('Por favor, selecciona un método de pago predeterminado');
      return;
    }

    const totalAmount = this.cart.totalWithDiscount(
      this.userService.isPremium()
    );

    const selectedPayment = this.userService.paymentMethods().find(p => p.id === chosenId);
    if ((selectedPayment?.saldoDisponible ?? 0) < totalAmount) {
      this.errorMessage.set('Fondos insuficientes en la tarjeta seleccionada.');
      return;
    }

    this.isProcessing.set(true);

    const orderItems = this.buildOrderItems();

    const createOrder$ = this.userService.createAndStoreOrder(
      orderItems,
      totalAmount,
      chosenId,
      {
        subtotal: this.cart.subtotal(),
        discount: this.cart.discountAmount(this.userService.isPremium()),
        shipping: this.cart.shippingFee(),
      }
    );

    const checkout$ = this.userService.isAdminUser()
      ? createOrder$
      : this.usuarioService.cobrarMetodoPago(chosenId, totalAmount).pipe(
        switchMap((chargeResult) => {
          this.userService.updateLocalPaymentBalance(chosenId, chargeResult.saldoDisponible);
          return createOrder$;
        })
      );

    checkout$.pipe(
      finalize(() => {
        this.isProcessing.set(false);
      })
    ).subscribe({
      next: (order) => {
        const paymentMethod = this.userService.paymentMethods().find(p => p.id === chosenId);
        const paymentMethodName = paymentMethod
          ? `${paymentMethod.tipo} terminada en ${paymentMethod.numeroTarjeta.slice(-4)}`
          : 'Método de pago no especificado';

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
          paymentMethod: paymentMethodName,
        });

        this.userService.fetchPaymentMethods();
        this.cart.clearCart();
        this.close();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudo procesar el pago.');
        this.userService.fetchPaymentMethods();
      }
    });
  }

  private buildOrderItems(): CreateOrderItemRequest[] {
    const groupedItems = new Map<number, CreateOrderItemRequest>();

    const addOrAccumulate = (platoId: number, name: string, quantity: number): void => {
      if (!Number.isFinite(platoId) || quantity <= 0) {
        return;
      }

      const current = groupedItems.get(platoId);
      if (current) {
        current.quantity += quantity;
        if (!current.name && name) {
          current.name = name;
        }
        return;
      }

      groupedItems.set(platoId, { platoId, name, quantity });
    };

    this.cart.items().forEach((item: CartItem) => {
      if (Array.isArray(item.components) && item.components.length > 0) {
        item.components.forEach((component: NonNullable<CartItem['components']>[number]) => {
          addOrAccumulate(
            Number(component.id),
            component.name,
            component.quantity * item.quantity
          );
        });
        return;
      }

      const platoId = Number(item.id);
      if (!Number.isFinite(platoId)) {
        return;
      }

      addOrAccumulate(platoId, item.name, item.quantity);
    });

    return [...groupedItems.values()];
  }
}
