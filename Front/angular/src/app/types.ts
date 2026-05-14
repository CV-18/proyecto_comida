// Interfaces para la integración con el backend

export interface Plato {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  country: string;
  isPremium: boolean;
  rating: number;
  stock?: number;
  ingredients?: string[];
}

export interface UsuarioPerfil {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  memberSince: string;
  balance: number;
  isPremium: boolean;
  premiumExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetodoPago {
  id: string;
  type: 'visa' | 'mastercard' | 'paypal' | 'bancaria';
  last4: string;
  holder: string;
  expiry: string;
  isDefault: boolean;
  color: string;
  createdAt: string;
}

export interface Pedido {
  id: string;
  userId: string;
  username: string;
  date: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  status: 'Pendiente' | 'Preparando' | 'En camino' | 'Entregado' | 'Cancelado';
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  paymentMethodId: string;
  deliveryAddress: string;
  notes?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  isPremium?: boolean;
}

export interface CartResponse {
  cartId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface CheckoutPayload {
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethodId: string;
  deliveryAddress: string;
}

export interface CheckoutResponse {
  orderId: string;
  status: 'success' | 'pending';
  message: string;
  transactionId: string;
  newBalance: number;
}