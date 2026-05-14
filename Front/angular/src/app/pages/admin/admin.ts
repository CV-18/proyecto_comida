import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogAdminService, type MenuCreateRequest, type PlatoCreateRequest } from '../../services/catalog-admin.service';
import { AuthService } from '../../services/auth.service';

type StatusState = 'idle' | 'saving' | 'success' | 'error';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.html',
})
export class Admin {
  readonly countries = ['Espanol', 'Italiano', 'Indio', 'Mexicano', 'Japones', 'Griego'];

  platoForm: PlatoCreateRequest = {
    name: '',
    country: 'Espanol',
    price: 0,
    image: '',
    description: '',
    rating: 5,
    isPremium: false,
  };

  menuForm: MenuCreateRequest = {
    name: '',
    category: 'Espanol',
    price: 0,
    image: '',
    description: '',
  };

  platoStatus: StatusState = 'idle';
  menuStatus: StatusState = 'idle';
  platoMessage = '';
  menuMessage = '';

  constructor(
    private readonly catalogAdminService: CatalogAdminService,
    public readonly authService: AuthService
  ) {}

  savePlato(): void {
    this.platoStatus = 'saving';
    this.platoMessage = '';

    this.catalogAdminService.createPlato({
      ...this.platoForm,
      price: Number(this.platoForm.price),
      rating: Number(this.platoForm.rating),
      image: this.platoForm.image?.trim() ?? '',
      description: this.platoForm.description.trim(),
      name: this.platoForm.name.trim(),
    }).subscribe({
      next: () => {
        this.platoStatus = 'success';
        this.platoMessage = 'El plato se guardo correctamente en la base de datos.';
        this.platoForm = {
          name: '',
          country: 'Espanol',
          price: 0,
          image: '',
          description: '',
          rating: 5,
          isPremium: false,
        };
      },
      error: () => {
        this.platoStatus = 'error';
        this.platoMessage = 'No se pudo guardar el plato. Revisa el endpoint o los permisos del backend.';
      }
    });
  }

  saveMenu(): void {
    this.menuStatus = 'saving';
    this.menuMessage = '';

    this.catalogAdminService.createMenu({
      ...this.menuForm,
      price: Number(this.menuForm.price),
      image: this.menuForm.image?.trim() ?? '',
      description: this.menuForm.description.trim(),
      name: this.menuForm.name.trim(),
    }).subscribe({
      next: () => {
        this.menuStatus = 'success';
        this.menuMessage = 'El menu se guardo correctamente en la base de datos.';
        this.menuForm = {
          name: '',
          category: 'Espanol',
          price: 0,
          image: '',
          description: '',
        };
      },
      error: () => {
        this.menuStatus = 'error';
        this.menuMessage = 'No se pudo guardar el menu. Revisa el endpoint o los permisos del backend.';
      }
    });
  }

  badgeClass(state: StatusState): string {
    if (state === 'success') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (state === 'error') {
      return 'border-rose-200 bg-rose-50 text-rose-700';
    }

    if (state === 'saving') {
      return 'border-amber-200 bg-amber-50 text-amber-700';
    }

    return 'border-gray-200 bg-gray-50 text-gray-500';
  }
}
