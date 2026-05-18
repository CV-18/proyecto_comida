import { Injectable, computed, effect, signal } from '@angular/core';
import { UserService } from './user.service';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  isPremium?: boolean;
  components?: {
    id: number;
    name: string;
    quantity: number;
  }[];
};

export const PREMIUM_DISCOUNT = 0.15;
export const SHIPPING_FEE = 2.99;
const CART_STORAGE_PREFIX = 'cart_items_';
const GUEST_CART_KEY = 'guest';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>([]);
  readonly isCartOpen = signal(false);
  public activeCartKey = GUEST_CART_KEY;

  constructor(private user: UserService) {
    this.activeCartKey = this.resolveCartKey();
    this.items.set(this.readCart(this.activeCartKey));

    effect(() => {
      const nextCartKey = this.resolveCartKey();
      if (nextCartKey === this.activeCartKey) {
        return;
      }

      this.persistCurrentCart();
      this.activeCartKey = nextCartKey;
      this.items.set(this.readCart(this.activeCartKey));
    });
  }

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
    this.persistCurrentCart();
    this.isCartOpen.set(true);
  }

  removeItem(id: string): void {
    this.items.update((prev) => prev.filter((item) => item.id !== id));
    this.persistCurrentCart();
  }

  updateQuantity(id: string, delta: number): void {
    this.items.update((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      })
    );
    this.persistCurrentCart();
  }

  clearCart(): void {
    this.items.set([]);
    this.persistCurrentCart();
  }

  discountAmount(isPremium: boolean): number {
    return isPremium ? this.subtotal() * PREMIUM_DISCOUNT : 0;
  }

  totalWithDiscount(isPremium: boolean): number {
    const shipping = this.shippingFee();
    return this.subtotal() - this.discountAmount(isPremium) + shipping;
  }

  private resolveCartKey(): string {
    const username = this.user.user()?.username?.trim().toLowerCase();
    return username && username.length > 0 ? username : GUEST_CART_KEY;
  }

  private storageKey(cartKey: string): string {
    return `${CART_STORAGE_PREFIX}${cartKey}`;
  }

  private readCart(cartKey: string): CartItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey(cartKey));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistCurrentCart(): void {
    try {
      localStorage.setItem(
        this.storageKey(this.activeCartKey),
        JSON.stringify(this.items())
      );
    } catch {
      // Ignore storage write errors to avoid blocking cart interactions.
    }
  }
}
