import { ChangeDetectorRef, Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogAdminService, type PlatoCreateRequest, type PlatoResponse, type PlatoUpdateRequest } from '../../services/catalog-admin.service';
import { AuthService } from '../../services/auth.service';

type StatusState = 'idle' | 'saving' | 'success' | 'error';

@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './admin.html',
})
export class Admin {
  readonly tipos      = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA'] as const;
  readonly categorias = ['ENTRANTE', 'PRINCIPAL', 'POSTRE'] as const;
  readonly variantes  = ['ESTANDAR', 'SIN_GLUTEN', 'VEGANO', 'PICANTE', 'BAJO_CARBOHIDRATO'] as const;
  readonly paises     = ['ESPANOL', 'ITALIANO', 'MEXICANO', 'JAPONES', 'INDIO', 'GRIEGO'] as const;
  readonly paisesFiltro = ['TODOS', ...this.paises] as const;

  platos: PlatoResponse[] = [];
  selectedPais: (typeof this.paisesFiltro)[number] = 'TODOS';
  editingPlatoId: number | null = null;
  modalOpen = false;
  deleteTarget: PlatoResponse | null = null;

  platoForm: PlatoCreateRequest = this.emptyForm();

  platoStatus: StatusState = 'idle';
  platoMessage = '';

  get premiumCount(): number {
    return this.platos.filter(p => p.isPremium).length;
  }

  get filteredPlatos(): PlatoResponse[] {
    return this.platos.filter((plato) => this.selectedPais === 'TODOS' || plato.pais === this.selectedPais);
  }

  constructor(
    private readonly catalogAdminService: CatalogAdminService,
    public readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    void this.loadPlatos();
  }

  async loadPlatos(): Promise<void> {
    this.platoStatus = 'saving';
    this.platoMessage = '';

    try {
      this.platos = await this.fetchAllPlatos();
      this.platoStatus = 'idle';
      this.cdr.detectChanges();
    } catch (error) {
      this.platos = [];
      this.platoStatus = 'error';
      this.platoMessage = this.extractErrorMessage(error, 'No se pudieron cargar los platos.');
      this.cdr.detectChanges();
    }
  }

  setPaisFilter(value: string): void {
    if (this.paisesFiltro.includes(value as (typeof this.paisesFiltro)[number])) {
      this.selectedPais = value as (typeof this.paisesFiltro)[number];
    }
  }

  openCreateModal(): void {
    this.editingPlatoId = null;
    this.platoForm = this.emptyForm();
    this.platoStatus = 'idle';
    this.platoMessage = '';
    this.modalOpen = true;
  }

  openEditModal(plato: PlatoResponse): void {
    this.editingPlatoId = plato.id;
    this.platoForm = {
      nombre:      plato.nombre,
      descripcion: plato.descripcion,
      tipo:        plato.tipo,
      categoria:   plato.categoria,
      pais:        plato.pais,
      variante:    plato.variante,
      precio:      plato.precio,
      cantidad:    plato.cantidad,
      isPremium:   plato.isPremium,
    };
    this.platoStatus = 'idle';
    this.platoMessage = '';
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingPlatoId = null;
    this.platoForm = this.emptyForm();
    this.platoMessage = '';
    this.platoStatus = 'idle';
  }

  savePlato(): void {
    this.platoStatus = 'saving';
    this.platoMessage = '';

    const payload = {
      ...this.platoForm,
      nombre:      this.platoForm.nombre.trim(),
      descripcion: this.platoForm.descripcion.trim(),
      precio:      Number(this.platoForm.precio),
      cantidad:    Number(this.platoForm.cantidad),
    };

    const request$ = this.editingPlatoId === null
      ? this.catalogAdminService.createPlato(payload as PlatoCreateRequest)
      : this.catalogAdminService.updatePlato(this.editingPlatoId, payload as PlatoUpdateRequest);

    request$.subscribe({
      next: () => {
        this.platoStatus = 'success';
        this.platoMessage = this.editingPlatoId === null
          ? 'Plato creado correctamente.'
          : 'Plato actualizado correctamente.';
        this.loadPlatos();
        setTimeout(() => this.closeModal(), 1200);
      },
      error: (error) => {
        this.platoStatus = 'error';
        this.platoMessage = this.extractErrorMessage(error, 'No se pudo guardar el plato.');
      },
    });
  }

  confirmDelete(plato: PlatoResponse): void {
    this.deleteTarget = plato;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  executeDelete(): void {
    if (!this.deleteTarget) return;
    const target = this.deleteTarget;
    this.platoStatus = 'saving';

    this.catalogAdminService.deletePlato(target.id).subscribe({
      next: () => {
        this.platoStatus = 'success';
        this.platoMessage = '"' + target.nombre + '" eliminado correctamente.';
        this.deleteTarget = null;
        this.loadPlatos();
        setTimeout(() => { this.platoMessage = ''; this.platoStatus = 'idle'; }, 3000);
      },
      error: (error) => {
        this.platoStatus = 'error';
        this.platoMessage = this.extractErrorMessage(error, 'No se pudo eliminar el plato.');
        this.deleteTarget = null;
      },
    });
  }

  private emptyForm(): PlatoCreateRequest {
    return {
      nombre:      '',
      descripcion: '',
      tipo:        'ALMUERZO',
      categoria:   'PRINCIPAL',
      pais:        'ESPANOL',
      variante:    'ESTANDAR',
      precio:      0,
      cantidad:    1,
      isPremium:   false,
    };
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const body = error.error;
    if (typeof body === 'string') return body.trim() || fallback;
    if (body && typeof body === 'object') {
      const d = body as Record<string, unknown>;
      const msg = d['message'] ?? d['errorMessage'] ?? d['detail'] ?? d['title'] ?? d['error'];
      if (typeof msg === 'string' && msg.trim()) return msg.trim();
    }
    return fallback;
  }

  badgeClass(state: StatusState): string {
    if (state === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (state === 'error')   return 'border-rose-200 bg-rose-50 text-rose-700';
    if (state === 'saving')  return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-gray-200 bg-gray-50 text-gray-500';
  }

  // Alias para compatibilidad
  startEditPlato(plato: PlatoResponse): void { this.openEditModal(plato); }
  cancelEditPlato(): void { this.closeModal(); }
  deletePlato(plato: PlatoResponse): void { this.confirmDelete(plato); }

  private async fetchAllPlatos(): Promise<PlatoResponse[]> {
    const firstPage = await this.fetchPlatosPage('/v1/platos');
    if (firstPage.totalPages <= 1) {
      return firstPage.items;
    }

    const pageRequests = Array.from({ length: firstPage.totalPages - 1 }, (_, index) => {
      const page = index + 1;
      return this.fetchPlatosPage(`/v1/platos?page=${page}&size=${firstPage.pageSize}`);
    });

    const rest = await Promise.all(pageRequests);
    return [...firstPage.items, ...rest.flatMap((page) => page.items)];
  }

  private async fetchPlatosPage(url: string): Promise<{ items: PlatoResponse[]; totalPages: number; pageSize: number }> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    const data = await response.json() as {
      content?: PlatoResponse[];
      totalPages?: number;
      pageSize?: number;
      size?: number;
    };

    const items = (data.content ?? []).map((plato) => ({
      ...plato,
      isPremium: plato.isPremium ?? false,
    }));

    return {
      items,
      totalPages: Math.max(1, Number(data.totalPages ?? 1) || 1),
      pageSize: Math.max(1, Number(data.pageSize ?? data.size ?? (items.length || 10)) || 10),
    };
  }
}
