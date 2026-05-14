import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Plato } from '../types';

@Injectable({
  providedIn: 'root'
})
export class DishService {
  readonly dishes = signal<Plato[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private api: ApiService) {}

  loadDishes(category?: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getDishes(category).subscribe({
      next: (dishes) => {
        this.dishes.set(dishes);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error loading dishes');
        this.loading.set(false);
        console.error('Error loading dishes:', err);
      }
    });
  }

  getDishById(id: string): Plato | undefined {
    return this.dishes().find(dish => dish.id === id);
  }
}