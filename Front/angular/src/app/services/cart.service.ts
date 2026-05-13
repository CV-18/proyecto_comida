import { Injectable, computed, signal } from '@angular/core';
import { UserService } from './user.service';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  isPremium?: boolean;
};

export const PREMIUM_DISCOUNT = 0.15;
export const SHIPPING_FEE = 2.99;

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);
  readonly isCartOpen = signal(false);

  constructor(private user: UserService) {}

  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  readonly itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  // Shipping fee: free for the user's first order or if premium
  readonly shippingFee = computed(() => {
    if (this.items().length === 0) return 0;
    // Free shipping: first order (no previous orders) OR user is premium
    const hasPreviousOrders = this.user.orders().length > 0;
    const isPremium = this.user.isPremium();
    return hasPreviousOrders && !isPremium ? SHIPPING_FEE : 0;
  });

  readonly total = computed(() => this.subtotal() + this.shippingFee());

  addItem(newItem: CartItem): void {
    this.items.update((prev) => {
      const existing = prev.find((item) => item.id === newItem.id);
      if (existing) {
        return prev.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }
      return [...prev, newItem];
    });
    this.isCartOpen.set(true);
  }

  removeItem(id: string): void {
    this.items.update((prev) => prev.filter((item) => item.id !== id));
  }

  updateQuantity(id: string, delta: number): void {
    this.items.update((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      })
    );
  }

  clearCart(): void {
    this.items.set([]);
  }

  discountAmount(isPremium: boolean): number {
    return isPremium ? this.subtotal() * PREMIUM_DISCOUNT : 0;
  }

  totalWithDiscount(isPremium: boolean): number {
    const shipping = this.shippingFee();
    return this.subtotal() - this.discountAmount(isPremium) + shipping;
  }
}
