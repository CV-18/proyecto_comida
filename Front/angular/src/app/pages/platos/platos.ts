import { ChangeDetectorRef, Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService, type CartItem } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { CatalogService } from '../../services/catalog.service';
import type { PlatoResponse } from '../../services/catalog-admin.service';

type PlatosViewItem = CartItem & { country: string; isPremium: boolean; description: string; rating: number };

const platoImages = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1564759224907-65b945ff0e84?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515136814290-75d6d6a5f3f7?q=80&w=1200&auto=format&fit=crop',
];

@Component({
  selector: 'app-platos',
  imports: [CurrencyPipe, RouterLink, TranslatePipe],
  templateUrl: './platos.html',
})
export class Platos {
  activeFilter = 'Todos';
  search = '';

  readonly filters = ['Todos', 'Mexicano', 'Indio', 'Griego', 'Italiano', 'Japones', 'Espanol', 'Premium'];

  platos: PlatosViewItem[] = [];

  constructor(
    private readonly cart: CartService,
    public userService: UserService,
    public translateService: TranslateService,
    private readonly catalogService: CatalogService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.loadPlatos();
  }

  private loadPlatos(): void {
    this.catalogService.listPlatos().subscribe({
      next: (platos) => {
        this.platos = platos.map((plato, index) => this.toViewItem(plato, index));
        this.cdr.detectChanges();
      },
      error: () => {
        this.platos = [];
        this.cdr.detectChanges();
      }
    });
  }

  private toViewItem(plato: PlatoResponse, index: number): PlatosViewItem {
    return {
      id: String(plato.id),
      name: plato.nombre,
      country: this.mapCountry(plato.categoria),
      price: plato.precio,
      quantity: 1,
      image: platoImages[index % platoImages.length],
      isPremium: plato.variante === 'BAJO_CARBOHIDRATO' || plato.precio >= 20,
      description: plato.descripcion,
      rating: this.computeRating(plato.id, plato.precio),
    };
  }

  private mapCountry(category: PlatoResponse['categoria']): string {
    switch (category) {
      case 'ENTRANTE':
        return 'Espanol';
      case 'PRINCIPAL':
        return 'Italiano';
      case 'POSTRE':
      default:
        return 'Mexicano';
    }
  }

  private computeRating(id: number, price: number): number {
    const base = 4.4 + (id % 6) * 0.1;
    const premiumBonus = price >= 20 ? 0.2 : 0;
    return Math.min(5, Number((base + premiumBonus).toFixed(1)));
  }

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
