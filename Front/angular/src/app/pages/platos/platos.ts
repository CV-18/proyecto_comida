import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService, type CartItem } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';

@Component({
  selector: 'app-platos',
  imports: [CurrencyPipe, RouterLink, TranslatePipe],
  templateUrl: './platos.html',
})
export class Platos {
  activeFilter = 'Todos';
  search = '';

  readonly filters = ['Todos', 'Mexicano', 'Indio', 'Griego', 'Italiano', 'Japones', 'Espanol', 'Premium'];

  readonly platos: Array<CartItem & { country: string; isPremium: boolean; description: string; rating: number }> = [
    { id: 'p1', name: 'Tacos al Pastor', country: 'Mexicano', price: 9.99, quantity: 1, image: '', isPremium: false, description: 'Tortillas de maiz con cerdo marinado.', rating: 4.8 },
    { id: 'p2', name: 'Curry de Pollo Tikka', country: 'Indio', price: 12.5, quantity: 1, image: '', isPremium: false, description: 'Salsa cremosa de tomate y especias.', rating: 4.9 },
    { id: 'p3', name: 'Ensalada Griega Tradicional', country: 'Griego', price: 8.5, quantity: 1, image: '', isPremium: false, description: 'Tomate, pepino, aceitunas y feta.', rating: 4.6 },
    { id: 'p4', name: 'Spaghetti Carbonara', country: 'Italiano', price: 11.95, quantity: 1, image: '', isPremium: false, description: 'Pasta con pecorino y panceta.', rating: 4.7 },
    { id: 'p5', name: 'Paella de Mariscos', country: 'Espanol', price: 16.0, quantity: 1, image: '', isPremium: false, description: 'Arroz con mariscos y azafran.', rating: 4.8 },
    { id: 'pp1', name: 'Wagyu A5 con Trufa Negra', country: 'Japones', price: 49.99, quantity: 1, image: '', isPremium: true, description: 'Seleccion exclusiva premium.', rating: 5.0 },
  ];

  constructor(
    private readonly cart: CartService,
    public userService: UserService,
    public translateService: TranslateService
  ) {}

  get filteredPlatos() {
    return this.platos.filter((plate) => {
      const matchesFilter =
        this.activeFilter === 'Todos'
          ? true
          : this.activeFilter === 'Premium'
            ? plate.isPremium
            : plate.country === this.activeFilter;
      const matchesSearch = plate.name.toLowerCase().includes(this.search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.search = input.value;
  }

  addToCart(item: CartItem & { isPremium?: boolean }): void {
    if (item.isPremium && !this.userService.isPremium()) {
      return;
    }
    this.cart.addItem({ ...item, quantity: 1 });
  }
}
