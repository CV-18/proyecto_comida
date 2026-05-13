import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartService, type CartItem } from '../../services/cart.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';

@Component({
  selector: 'app-menus',
  imports: [CurrencyPipe, TranslatePipe],
  templateUrl: './menus.html',
})
export class Menus {
  activeCategory = 'Espanol';

  readonly categories = ['Espanol', 'Italiano', 'Indio', 'Mexicano', 'Japones', 'Griego'];

  readonly menusByCategory: Record<string, CartItem[]> = {
    Espanol: [
      { id: 'es-1', name: 'Menu Paella', price: 14.95, quantity: 1, image: '' },
      { id: 'es-2', name: 'Menu Tapas', price: 15.95, quantity: 1, image: '' },
      { id: 'es-3', name: 'Menu Mediterraneo', price: 17.95, quantity: 1, image: '' },
    ],
    Italiano: [
      { id: 'it-1', name: 'Menu Pasta Fresca', price: 13.95, quantity: 1, image: '' },
      { id: 'it-2', name: 'Menu Carbonara', price: 14.95, quantity: 1, image: '' },
      { id: 'it-3', name: 'Menu Toscana', price: 16.95, quantity: 1, image: '' },
    ],
    Indio: [
      { id: 'in-1', name: 'Menu Curry', price: 12.95, quantity: 1, image: '' },
      { id: 'in-2', name: 'Menu Tikka', price: 13.95, quantity: 1, image: '' },
      { id: 'in-3', name: 'Menu Masala', price: 14.95, quantity: 1, image: '' },
    ],
    Mexicano: [
      { id: 'mx-1', name: 'Menu Tacos', price: 11.95, quantity: 1, image: '' },
      { id: 'mx-2', name: 'Menu Burrito', price: 12.95, quantity: 1, image: '' },
      { id: 'mx-3', name: 'Menu Pastor', price: 13.95, quantity: 1, image: '' },
    ],
    Japones: [
      { id: 'jp-1', name: 'Menu Sushi', price: 16.95, quantity: 1, image: '' },
      { id: 'jp-2', name: 'Menu Nigiri', price: 17.95, quantity: 1, image: '' },
      { id: 'jp-3', name: 'Menu Maki', price: 15.95, quantity: 1, image: '' },
    ],
    Griego: [
      { id: 'gr-1', name: 'Menu Gyros', price: 12.95, quantity: 1, image: '' },
      { id: 'gr-2', name: 'Menu Feta', price: 13.95, quantity: 1, image: '' },
      { id: 'gr-3', name: 'Menu Santorini', price: 14.95, quantity: 1, image: '' },
    ],
  };

  constructor(
    private readonly cart: CartService,
    public translateService: TranslateService
  ) {}

  get menus(): CartItem[] {
    return this.menusByCategory[this.activeCategory] ?? [];
  }

  setCategory(category: string): void {
    this.activeCategory = category;
  }

  addToCart(item: CartItem): void {
    this.cart.addItem({ ...item, quantity: 1 });
  }
}
