import { ChangeDetectorRef, Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  readonly pageSize = 10;
  currentPage = 1;

  readonly filters = [
    { value: 'Todos',    label: 'Todos'    },
    { value: 'Mexicano', label: 'Mexicano' },
    { value: 'Indio',    label: 'Indio'    },
    { value: 'Griego',   label: 'Griego'   },
    { value: 'Italiano', label: 'Italiano' },
    { value: 'Japones',  label: 'Japonés'  },
    { value: 'Espanol',  label: 'Español'  },
    { value: 'Premium',  label: 'Premium'  },
  ];

  platos: PlatosViewItem[] = [];

  constructor(
    private readonly cart: CartService,
    public userService: UserService,
    public translateService: TranslateService,
    private readonly catalogService: CatalogService,
    private readonly cdr: ChangeDetectorRef,
    private readonly route: ActivatedRoute
  ) {
    this.route.queryParamMap.subscribe((params) => {
      const filter = params.get('filter');
      if (!filter) {
        return;
      }

      const normalizedFilter = this.normalizeCountry(filter);
      if (this.filters.some((item) => item.value === normalizedFilter)) {
        this.activeFilter = normalizedFilter;
      }
    });

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
      country: this.mapCountry(plato.pais),
      price: plato.precio,
      quantity: 1,
      image: platoImages[index % platoImages.length],
      isPremium: plato.isPremium,
      description: plato.descripcion,
      rating: this.computeRating(plato.id, plato.precio),
    };
  }

  private mapCountry(pais: PlatoResponse['pais']): string {
    switch (this.normalizeCountry(pais)) {
      case 'ESPANOL':  return 'Español';
      case 'ITALIANO': return 'Italiano';
      case 'MEXICANO': return 'Mexicano';
      case 'JAPONES':  return 'Japones';
      case 'INDIO':    return 'Indio';
      case 'GRIEGO':   return 'Griego';
      default:         return 'Español';
    }
  }

  private normalizeCountry(country: string): string {
    return country.trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPlatos.length / this.pageSize));
  }

  get paginatedPlatos(): PlatosViewItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPlatos.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.filteredPlatos.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredPlatos.length);
  }

  setFilter(filter: { value: string; label: string }): void {
    this.activeFilter = filter.value;
    this.currentPage = 1;
  }

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.search = input.value;
    this.currentPage = 1;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  addToCart(item: CartItem & { isPremium?: boolean }): void {
    if (item.isPremium && !this.userService.isPremium()) {
      return;
    }
    this.cart.addItem({ ...item, quantity: 1 });
  }
}
