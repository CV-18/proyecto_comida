import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { DishService } from '../../services/dish.service';
import { type Plato } from '../../types';

@Component({
  selector: 'app-platos',
  imports: [CurrencyPipe, TranslatePipe],
  templateUrl: './platos.html',
})
export class Platos implements OnInit {
  activeFilter = 'Todos';
  search = '';

  readonly filters = ['Todos', 'Mexicano', 'Indio', 'Griego', 'Italiano', 'Japones', 'Espanol', 'Premium'];

  constructor(
    private readonly cart: CartService,
    public userService: UserService,
    public translateService: TranslateService,
    public dishService: DishService
  ) {}

  ngOnInit(): void {
    this.dishService.loadDishes();
  }

  get filteredPlatos() {
    return this.dishService.dishes().filter((plate: any) => {
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

  addToCart(plato: Plato): void {
    if (plato.isPremium && !this.userService.isPremium()) {
      return;
    }
    this.cart.addItem({
      id: plato.id,
      name: plato.name,
      price: plato.price,
      image: plato.image,
      quantity: 1,
      isPremium: plato.isPremium
    });
  }
}
