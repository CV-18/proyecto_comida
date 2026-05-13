import { Injectable, signal } from '@angular/core';

export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard';
  last4: string;
  holder: string;
  expiry: string;
  isDefault: boolean;
  color: string;
}

export interface Order {
  id: string;
  date: string;
  total: number;
  username: string;
  status: 'Entregado' | 'En camino' | 'Cancelado' | 'Pendiente';
  items: string[];
  itemCount: number;
}

export interface UserProfile {
  username: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  memberSince: string;
  balance?: number; // Saldo disponible
}

interface StoredAccount extends UserProfile {
  password: string;
}

const mockOrders: Order[] = [
  {
    id: 'ORD-001234',
    date: '2026-04-28',
    total: 38.47,
    username: 'jose_doe',
    status: 'Entregado',
    items: ['Paella de Mariscos', 'Spaghetti Carbonara'],
    itemCount: 2,
  },
  {
    id: 'ORD-001198',
    date: '2026-04-15',
    total: 22.99,
    username: 'jose_doe',
    status: 'Entregado',
    items: ['Tacos al Pastor', 'Tarta de Chocolate Belga'],
    itemCount: 3,
  },
];

const mockPayments: PaymentMethod[] = [
  {
    id: 'card-1',
    type: 'visa',
    last4: '4242',
    holder: 'JOSE DOE',
    expiry: '12/28',
    isDefault: true,
    color: 'from-gray-800 to-gray-900',
  },
  {
    id: 'card-2',
    type: 'mastercard',
    last4: '8731',
    holder: 'JOSE DOE',
    expiry: '09/27',
    isDefault: false,
    color: 'from-orange-600 to-amber-700',
  },
];

@Injectable({ providedIn: 'root' })
export class UserService {
  readonly isLoggedIn = signal(false);
  readonly isPremium = signal(false);
  readonly paymentMethods = signal<PaymentMethod[]>(mockPayments);
  readonly orders = signal<Order[]>(mockOrders);
  readonly defaultPaymentId = signal<string | null>('card-1');
  readonly user = signal<UserProfile | null>(null);
  readonly accounts = signal<StoredAccount[]>([]);
  readonly guestBalance = signal(100);

  login(): void {
    this.isLoggedIn.set(true);
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.isPremium.set(false);
  }

  subscribePremium(): void {
    this.isPremium.set(true);
  }

  cancelPremium(): void {
    this.isPremium.set(false);
  }

  addPaymentMethod(method: Omit<PaymentMethod, 'id'>): void {
    const newMethod: PaymentMethod = { ...method, id: `card-${Date.now()}` };
    this.paymentMethods.update((prev) => {
      if (newMethod.isDefault) {
        return [...prev.map((m) => ({ ...m, isDefault: false })), newMethod];
      }
      return [...prev, newMethod];
    });
  }

  removePaymentMethod(id: string): void {
    this.paymentMethods.update((prev) => prev.filter((m) => m.id !== id));
  }

  setDefaultPayment(id: string): void {
    this.defaultPaymentId.set(id);
    this.paymentMethods.update((prev) =>
      prev.map((m) => ({ ...m, isDefault: m.id === id }))
    );
  }

  updateUser(data: Partial<UserProfile>): void {
    const prev = this.user();
    if (prev) {
      this.user.set({ ...prev, ...data });
    } else {
      this.user.set({
        username: data.username ?? '',
        name: data.name ?? '',
        email: data.email ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        memberSince: new Date().getFullYear().toString(),
      });
      this.isLoggedIn.set(true);
    }
  }

  usernameExists(username: string): boolean {
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      return false;
    }

    return this.accounts().some((account) => account.username.toLowerCase() === normalizedUsername);
  }

  emailExists(email: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    return this.accounts().some((account) => account.email.toLowerCase() === normalizedEmail);
  }

  registerAccount(account: {
    username: string;
    name: string;
    email: string;
    phone: string;
    password: string;
  }): boolean {
    if (this.usernameExists(account.username) || this.emailExists(account.email)) {
      return false;
    }

    const storedAccount: StoredAccount = {
      username: account.username.trim(),
      name: account.name.trim(),
      email: account.email.trim(),
      address: '',
      phone: account.phone.trim(),
      memberSince: new Date().getFullYear().toString(),
      password: account.password,
    };

    this.accounts.update((prev) => [...prev, storedAccount]);
    this.user.set({
      username: storedAccount.username,
      name: storedAccount.name,
      email: storedAccount.email,
      address: storedAccount.address,
      phone: storedAccount.phone,
      memberSince: storedAccount.memberSince,
    });
    this.isLoggedIn.set(true);

    return true;
  }

  createOrder(items: { name: string; quantity: number }[], total: number): Order {
    const username = this.user()?.username?.trim() || 'guest';

    const newOrder: Order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      total: total,
      username,
      status: 'Pendiente',
      items: items.map((item) => `${item.name} x${item.quantity}`),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };

    this.orders.update((prev) => [newOrder, ...prev]);
    return newOrder;
  }

  hasPaymentMethod(): boolean {
    return this.paymentMethods().length > 0;
  }

  hasDefaultPaymentMethod(): boolean {
    return (
      this.paymentMethods().length > 0 && this.defaultPaymentId() !== null
    );
  }

  hasAvailableFunds(amount: number): boolean {
    const user = this.user();
    const balance = user?.balance ?? this.guestBalance();
    return balance >= amount;
  }

  deductFunds(amount: number): boolean {
    const user = this.user();
    if (!user) {
      const currentGuestBalance = this.guestBalance();
      if (currentGuestBalance < amount) return false;
      this.guestBalance.set(currentGuestBalance - amount);
      return true;
    }

    const currentBalance = user.balance ?? 0;
    if (currentBalance < amount) return false;

    const newBalance = currentBalance - amount;
    this.user.set({ ...user, balance: newBalance });
    return true;
  }

  addFunds(amount: number): void {
    const user = this.user();
    if (!user) return;

    const currentBalance = user.balance ?? 0;
    this.user.set({ ...user, balance: currentBalance + amount });
  }

  getUserBalance(): number {
    const user = this.user();
    return user?.balance ?? this.guestBalance();
  }
}
