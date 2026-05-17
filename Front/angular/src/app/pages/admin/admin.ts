import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogAdminService, type PlatoCreateRequest, type PlatoResponse, type PlatoUpdateRequest } from '../../services/catalog-admin.service';

type StatusState = 'idle' | 'saving' | 'success' | 'error';

type PlatoForm = PlatoCreateRequest & {
  imageUrl: string;
};

@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Admin {
  readonly tipos       = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA'] as const;
  readonly categorias  = ['ENTRANTE', 'PRINCIPAL', 'POSTRE'] as const;
  readonly variantes   = ['ESTANDAR', 'SIN_GLUTEN', 'VEGANO', 'PICANTE', 'BAJO_CARBOHIDRATO'] as const;
  readonly paises      = ['ESPANOL', 'ITALIANO', 'MEXICANO', 'JAPONES', 'INDIO', 'GRIEGO'] as const;
  readonly paisesFiltro = ['TODOS', ...this.paises] as const;

  // ── Signals ──────────────────────────────────────────
  readonly platos      = signal<PlatoResponse[]>([]);
  readonly selectedPais = signal<(typeof this.paisesFiltro)[number]>('TODOS');
  readonly modalOpen   = signal(false);
  readonly deleteTarget = signal<PlatoResponse | null>(null);
  readonly editingPlatoId = signal<number | null>(null);
  readonly platoStatus = signal<StatusState>('idle');
  readonly platoMessage = signal('');

  // ── Computed ─────────────────────────────────────────
  readonly filteredPlatos = computed(() => {
    const pais = this.selectedPais();
    return this.platos().filter(p => pais === 'TODOS' || p.pais === pais);
  });

  readonly premiumCount = computed(() => this.platos().filter(p => p.isPremium).length);

  // ── Formulario (no necesita signal, ngModel lo gestiona) ──
  platoForm: PlatoForm = this.emptyForm();

  constructor(
    private readonly catalogAdminService: CatalogAdminService,
  ) {
    this.loadPlatos();
  }

  // ── Carga inicial ─────────────────────────────────────
  loadPlatos(): void {
    this.platoStatus.set('saving');
    this.platoMessage.set('');

    this.catalogAdminService.listPlatos().subscribe({
      next: (platos) => {
        this.platos.set(platos);
        this.platoStatus.set('idle');
      },
      error: (error) => {
        this.platoStatus.set('error');
        this.platoMessage.set(this.extractErrorMessage(error, 'No se pudieron cargar los platos.'));
      },
    });
  }

  // ── Filtro ────────────────────────────────────────────
  setPaisFilter(value: string): void {
    if (this.paisesFiltro.includes(value as (typeof this.paisesFiltro)[number])) {
      this.selectedPais.set(value as (typeof this.paisesFiltro)[number]);
    }
  }

  formatPais(pais: string): string {
    switch (pais) {
      case 'ESPANOL': return 'Español';
      case 'ITALIANO': return 'Italiano';
      case 'MEXICANO': return 'Mexicano';
      case 'JAPONES': return 'Japonés';
      case 'INDIO': return 'Indio';
      case 'GRIEGO': return 'Griego';
      case 'TODOS': return 'Todos';
      default: return pais;
    }
  }

  // ── Modal crear ───────────────────────────────────────
  openCreateModal(): void {
    this.editingPlatoId.set(null);
    this.platoForm = this.emptyForm();
    this.platoStatus.set('idle');
    this.platoMessage.set('');
    this.modalOpen.set(true);
  }

  // ── Modal editar ──────────────────────────────────────
  openEditModal(plato: PlatoResponse): void {
    this.editingPlatoId.set(plato.id);
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
      imageUrl:    plato.image ?? '',
    };
    this.platoStatus.set('idle');
    this.platoMessage.set('');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingPlatoId.set(null);
    this.platoForm = this.emptyForm();
    this.platoMessage.set('');
    this.platoStatus.set('idle');
  }

  // ── Guardar (crear o editar) ──────────────────────────
  savePlato(): void {
    this.platoStatus.set('saving');
    this.platoMessage.set('');

    const editId = this.editingPlatoId();
    const payload = {
      nombre:      this.platoForm.nombre.trim(),
      descripcion: this.platoForm.descripcion.trim(),
      tipo:        this.platoForm.tipo,
      categoria:   this.platoForm.categoria,
      pais:        this.platoForm.pais,
      variante:    this.platoForm.variante,
      precio:      Number(this.platoForm.precio),
      cantidad:    Number(this.platoForm.cantidad),
      isPremium:   this.platoForm.isPremium,
    };

    const request$ = editId === null
      ? this.catalogAdminService.createPlato(payload as PlatoCreateRequest)
      : this.catalogAdminService.updatePlato(editId, payload as PlatoUpdateRequest);

    request$.subscribe({
      next: (saved) => {
        this.catalogAdminService.saveLocalImage(saved.id, this.platoForm.imageUrl);

        // Actualiza el signal localmente sin volver a llamar al back
        if (editId === null) {
          this.platos.update(prev => [...prev, saved]);
        } else {
          this.platos.update(prev =>
            prev.map(p => p.id === editId ? { ...p, ...saved } : p)
          );
        }
        this.platoStatus.set('success');
        this.platoMessage.set(editId === null ? 'Plato creado correctamente.' : 'Plato actualizado correctamente.');
        setTimeout(() => this.closeModal(), 1000);
      },
      error: (error) => {
        this.platoStatus.set('error');
        this.platoMessage.set(this.extractErrorMessage(error, 'No se pudo guardar el plato.'));
      },
    });
  }

  // ── Toggle premium rápido desde la tabla ─────────────
  togglePremium(plato: PlatoResponse): void {
    const nuevoValor = !plato.isPremium;

    // Actualiza el signal inmediatamente (optimistic update)
    this.platos.update(prev =>
      prev.map(p => p.id === plato.id ? { ...p, isPremium: nuevoValor } : p)
    );

    this.catalogAdminService.updatePlato(plato.id, { isPremium: nuevoValor }).subscribe({
      error: () => {
        // Si falla, revierte el cambio
        this.platos.update(prev =>
          prev.map(p => p.id === plato.id ? { ...p, isPremium: !nuevoValor } : p)
        );
        this.platoMessage.set('No se pudo cambiar el estado premium.');
        this.platoStatus.set('error');
      },
    });
  }

  // ── Borrado con confirmación ──────────────────────────
  confirmDelete(plato: PlatoResponse): void {
    this.deleteTarget.set(plato);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.platoStatus.set('saving');

    this.catalogAdminService.deletePlato(target.id).subscribe({
      next: () => {
        // Elimina del signal localmente
        this.platos.update(prev => prev.filter(p => p.id !== target.id));
        this.platoStatus.set('success');
        this.platoMessage.set('"' + target.nombre + '" eliminado correctamente.');
        this.deleteTarget.set(null);
        setTimeout(() => { this.platoMessage.set(''); this.platoStatus.set('idle'); }, 3000);
      },
      error: (error) => {
        this.platoStatus.set('error');
        this.platoMessage.set(this.extractErrorMessage(error, 'No se pudo eliminar el plato.'));
        this.deleteTarget.set(null);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────
  private emptyForm(): PlatoForm {
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
      imageUrl:    '',
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
}
