import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogAdminService, type PlatoCreateRequest, type PlatoResponse, type PlatoUpdateRequest } from '../../services/catalog-admin.service';
import { AuthService } from '../../services/auth.service';

type StatusState = 'idle' | 'saving' | 'success' | 'error';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.html',
})
export class Admin {
  readonly sections = [
    { id: 'platos', title: 'Platos', description: 'Crear, editar y borrar platos' },
  ] as const;

  readonly tipos = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA'] as const;
  readonly categorias = ['ENTRANTE', 'PRINCIPAL', 'POSTRE'] as const;
  readonly variantes = ['ESTANDAR', 'SIN_GLUTEN', 'VEGANO', 'PICANTE', 'BAJO_CARBOHIDRATO'] as const;

  platos: PlatoResponse[] = [];
  editingPlatoId: number | null = null;

  platoForm: PlatoCreateRequest = {
    nombre: '',
    descripcion: '',
    tipo: 'ALMUERZO',
    categoria: 'PRINCIPAL',
    variante: 'ESTANDAR',
    precio: 0,
    cantidad: 1,
  };

  platoStatus: StatusState = 'idle';
  platoMessage = '';

  constructor(
    private readonly catalogAdminService: CatalogAdminService,
    public readonly authService: AuthService
  ) {
    this.loadPlatos();
  }

  loadPlatos(): void {
    this.catalogAdminService.listPlatos().subscribe({
      next: (platos) => {
        this.platos = platos;
      },
      error: () => {
        this.platos = [];
      }
    });
  }

  startEditPlato(plato: PlatoResponse): void {
    this.editingPlatoId = plato.id;
    this.platoForm = {
      nombre: plato.nombre,
      descripcion: plato.descripcion,
      tipo: plato.tipo,
      categoria: plato.categoria,
      variante: plato.variante,
      precio: plato.precio,
      cantidad: plato.cantidad,
    };
  }

  cancelEditPlato(): void {
    this.editingPlatoId = null;
    this.resetPlatoForm();
  }

  private resetPlatoForm(): void {
    this.platoForm = {
      nombre: '',
      descripcion: '',
      tipo: 'ALMUERZO',
      categoria: 'PRINCIPAL',
      variante: 'ESTANDAR',
      precio: 0,
      cantidad: 1,
    };
  }

  savePlato(): void {
    this.platoStatus = 'saving';
    this.platoMessage = '';

    const payload: PlatoCreateRequest | PlatoUpdateRequest = {
      ...this.platoForm,
      nombre: this.platoForm.nombre.trim(),
      descripcion: this.platoForm.descripcion.trim(),
      precio: Number(this.platoForm.precio),
      cantidad: Number(this.platoForm.cantidad),
    };

    const request$ = this.editingPlatoId === null
      ? this.catalogAdminService.createPlato(payload as PlatoCreateRequest)
      : this.catalogAdminService.updatePlato(this.editingPlatoId, payload as PlatoUpdateRequest);

    request$.subscribe({
      next: () => {
        this.platoStatus = 'success';
        this.platoMessage = this.editingPlatoId === null ? 'El plato se guardo correctamente en la base de datos.' : 'El plato se actualizo correctamente en la base de datos.';
        this.editingPlatoId = null;
        this.resetPlatoForm();
        this.loadPlatos();
      },
      error: () => {
        this.platoStatus = 'error';
        this.platoMessage = this.editingPlatoId === null ? 'No se pudo guardar el plato. Revisa el endpoint o los permisos del backend.' : 'No se pudo actualizar el plato. Revisa el endpoint o los permisos del backend.';
      }
    });
  }

  deletePlato(plato: PlatoResponse): void {
    this.platoStatus = 'saving';
    this.platoMessage = '';

    this.catalogAdminService.deletePlato(plato.id).subscribe({
      next: () => {
        this.platoStatus = 'success';
        this.platoMessage = 'El plato se elimino correctamente.';
        if (this.editingPlatoId === plato.id) {
          this.cancelEditPlato();
        }
        this.loadPlatos();
      },
      error: () => {
        this.platoStatus = 'error';
        this.platoMessage = 'No se pudo eliminar el plato. Revisa el endpoint o los permisos del backend.';
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
