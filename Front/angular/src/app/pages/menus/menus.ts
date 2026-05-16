import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { CartService, type CartItem } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import type { PlatoResponse } from '../../services/catalog-admin.service';

type CountryKey = 'Espanol' | 'Italiano' | 'Indio' | 'Mexicano' | 'Japones' | 'Griego';
type MenuScope = CountryKey | 'Todos';

type MenuDish = CartItem & {
  country: CountryKey;
  tipo: PlatoResponse['tipo'];
  categoria: PlatoResponse['categoria'];
  description: string;
  isPremium: boolean;
};

type MenuSlotId = 'entrada' | 'principal' | 'postre';

interface CountryOption {
  value: MenuScope;
  label: string;
  description: string;
}

interface MenuSlot {
  id: MenuSlotId;
  title: string;
  subtitle: string;
  allowedCategories: PlatoResponse['categoria'][];
}

const dishImages = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1564759224907-65b945ff0e84?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515136814290-75d6d6a5f3f7?q=80&w=1200&auto=format&fit=crop',
];

@Component({
  selector: 'app-menus',
  imports: [CurrencyPipe, RouterLink, TranslatePipe],
  templateUrl: './menus.html',
})
export class Menus implements OnInit {
  readonly pageSize = 10;
  readonly countries: CountryOption[] = [
    { value: 'Todos', label: 'Todos los países', description: 'Solo para usuarios premium' },
    { value: 'Espanol', label: 'Español', description: 'Sabores clásicos y recetas mediterráneas' },
    { value: 'Mexicano', label: 'Mexicano', description: 'Toques intensos, frescos y especiados' },
    { value: 'Italiano', label: 'Italiano', description: 'Pasta, risotto y cocina de horno' },
    { value: 'Japones', label: 'Japonés', description: 'Ligero, elegante y muy visual' },
    { value: 'Indio', label: 'Indio', description: 'Especias, aroma y mucho contraste' },
    { value: 'Griego', label: 'Griego', description: 'Cocina fresca, colorida y equilibrada' },
  ];

  readonly slots: MenuSlot[] = [
    { id: 'entrada', title: 'Primer plato', subtitle: 'Elige un entrante o plato ligero', allowedCategories: ['ENTRANTE', 'PRINCIPAL'] },
    { id: 'principal', title: 'Segundo plato', subtitle: 'Elige un plato principal', allowedCategories: ['PRINCIPAL'] },
    { id: 'postre', title: 'Tercer plato', subtitle: 'Solo postres', allowedCategories: ['POSTRE'] },
  ];

  activeCategory: MenuScope = 'Espanol';
  dishes: MenuDish[] = [];
  selectedDishBySlot: Record<MenuSlotId, MenuDish | null> = {
    entrada: null,
    principal: null,
    postre: null,
  };
  activeSlot: MenuSlotId | null = null;
  modalPage = 1;
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly catalogService: CatalogService,
    private readonly cart: CartService,
    public userService: UserService,
    public translateService: TranslateService
    , private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDishes();
  }

  get availableDishes(): MenuDish[] {
    return this.dishes.filter((dish) => this.matchesScope(dish) && this.matchesPremium(dish));
  }

  get selectedDishes(): MenuDish[] {
    return this.slots
      .map((slot) => this.selectedDishBySlot[slot.id])
      .filter((dish): dish is MenuDish => Boolean(dish));
  }

  get menuPrice(): number {
    return this.selectedDishes.reduce((sum, dish) => sum + dish.price, 0);
  }

  get canCreateMenu(): boolean {
    return this.slots.every((slot) => Boolean(this.selectedDishBySlot[slot.id]));
  }

  get currentSlot(): MenuSlot | null {
    return this.slots.find((slot) => slot.id === this.activeSlot) ?? null;
  }

  get paginatedDishes(): MenuDish[] {
    const start = (this.modalPage - 1) * this.pageSize;
    return this.filteredModalDishes.slice(start, start + this.pageSize);
  }

  get filteredModalDishes(): MenuDish[] {
    if (!this.currentSlot) {
      return [];
    }

    return this.availableDishes.filter((dish) => this.currentSlot?.allowedCategories.includes(dish.categoria));
  }

  get totalModalPages(): number {
    return Math.max(1, Math.ceil(this.filteredModalDishes.length / this.pageSize));
  }

  get modalPageStart(): number {
    return this.filteredModalDishes.length === 0 ? 0 : (this.modalPage - 1) * this.pageSize + 1;
  }

  get modalPageEnd(): number {
    return Math.min(this.modalPage * this.pageSize, this.filteredModalDishes.length);
  }

  private loadDishes(): void {
    this.isLoading = true;
    this.catalogService.listPlatos().subscribe({
      next: (platos) => {
        this.dishes = platos.map((plato, index) => this.toMenuDish(plato, index));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.dishes = [];
        this.isLoading = false;
        this.errorMessage = 'No se pudieron cargar los platos del catálogo.';
        this.cdr.detectChanges();
      }
    });
  }

  private toMenuDish(plato: PlatoResponse, index: number): MenuDish {
    return {
      id: String(plato.id),
      name: plato.nombre,
      price: plato.precio,
      quantity: 1,
      image: dishImages[index % dishImages.length],
      country: this.mapCountry(plato.pais),
      tipo: plato.tipo,
      categoria: plato.categoria,
      description: plato.descripcion,
      isPremium: plato.isPremium,
    };
  }

  private mapCountry(pais: PlatoResponse['pais']): CountryKey {
    switch (pais) {
      case 'ITALIANO': return 'Italiano';
      case 'MEXICANO': return 'Mexicano';
      case 'JAPONES': return 'Japones';
      case 'INDIO': return 'Indio';
      case 'GRIEGO': return 'Griego';
      case 'ESPANOL':
      default:
        return 'Espanol';
    }
  }

  private matchesScope(dish: MenuDish): boolean {
    return this.activeCategory === 'Todos' || dish.country === this.activeCategory;
  }

  private matchesPremium(dish: MenuDish): boolean {
    return this.userService.isPremium() || !dish.isPremium;
  }

  setCategory(category: MenuScope): void {
    if (category === 'Todos' && !this.userService.isPremium()) {
      this.errorMessage = 'El modo Todos los países está disponible solo para usuarios premium.';
      return;
    }

    this.activeCategory = category;
    this.selectedDishBySlot = {
      entrada: null,
      principal: null,
      postre: null,
    };
    this.errorMessage = '';
    this.closeModal();
  }

  openSlot(slotId: MenuSlotId): void {
    console.log('openSlot called with:', slotId);
    this.activeSlot = slotId;
    this.modalPage = 1;
    this.errorMessage = '';
    this.cdr.detectChanges();

    if (slotId === 'postre') {
      const postres = this.availableDishes.filter((dish) => dish.categoria === 'POSTRE');
      if (postres.length === 0) {
        this.errorMessage = 'No hay postres disponibles para esta selección.';
      }
    }
  }

  closeModal(): void {
    this.activeSlot = null;
    this.modalPage = 1;
  }

  previousModalPage(): void {
    if (this.modalPage > 1) {
      this.modalPage -= 1;
    }
  }

  nextModalPage(): void {
    if (this.modalPage < this.totalModalPages) {
      this.modalPage += 1;
    }
  }

  selectDish(dish: MenuDish): void {
    if (!this.activeSlot) {
      return;
    }

    if (dish.isPremium && !this.userService.isPremium()) {
      this.errorMessage = 'Los platos premium solo están disponibles para usuarios premium.';
      return;
    }

    this.selectedDishBySlot = {
      ...this.selectedDishBySlot,
      [this.activeSlot]: dish,
    };
    this.closeModal();
  }

  addMenuToCart(): void {
    if (!this.canCreateMenu) {
      this.errorMessage = 'Selecciona un plato en cada card para crear el menú.';
      return;
    }

    const entrada = this.selectedDishBySlot.entrada;
    const principal = this.selectedDishBySlot.principal;
    const postre = this.selectedDishBySlot.postre;

    if (!entrada || !principal || !postre) {
      this.errorMessage = 'Selecciona un plato en cada card para crear el menú.';
      return;
    }

    const menuItem: CartItem = {
      id: `menu-${this.activeCategory.toLowerCase()}-${entrada.id}-${principal.id}-${postre.id}`,
      name: `Menú ${this.getCountryLabel(this.activeCategory)} personalizado`,
      price: this.menuPrice,
      quantity: 1,
      image: entrada.image,
      isPremium: this.selectedDishes.some((dish) => dish.isPremium),
    };

    this.cart.addItem(menuItem);
    this.selectedDishBySlot = {
      entrada: null,
      principal: null,
      postre: null,
    };
    this.errorMessage = '';
  }

  private getCountryLabel(country: MenuScope): string {
    if (country === 'Todos') {
      return 'Global';
    }

    switch (country) {
      case 'Italiano': return 'Italiano';
      case 'Mexicano': return 'Mexicano';
      case 'Japones': return 'Japonés';
      case 'Indio': return 'Indio';
      case 'Griego': return 'Griego';
      case 'Espanol':
      default:
        return 'Español';
    }
  }
}
