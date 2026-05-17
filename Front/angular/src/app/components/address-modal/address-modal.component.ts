import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressCreateRequest } from '../../models/address.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-address-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" *ngIf="isOpen()">
      <div class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 sm:text-3xl">{{ 'address.addTitle' | translate }}</h2>
            <p class="mt-2 text-sm text-gray-600">{{ 'address.addSubtitle' | translate }}</p>
          </div>
          <button
            type="button"
            (click)="onCancel()"
            class="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form (submit)="$event.preventDefault(); onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              [(ngModel)]="form.direccion"
              name="direccion"
              placeholder="Dirección completa"
              class="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none"
              required
            />

            <input
              type="text"
              [(ngModel)]="form.codigoPostal"
              name="codigoPostal"
              placeholder="Código postal"
              class="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none"
              required
            />

            <input
              type="text"
              [(ngModel)]="form.ciudad"
              name="ciudad"
              placeholder="Ciudad"
              class="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none"
              required
            />

            <select
              [(ngModel)]="form.pais"
              name="pais"
              class="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none"
              required
            >
              <option value="">Selecciona país</option>
              <option value="España">España</option>
              <option value="México">México</option>
              <option value="Italia">Italia</option>
              <option value="Japón">Japón</option>
              <option value="India">India</option>
              <option value="Grecia">Grecia</option>
            </select>
          </div>

          <div class="flex gap-3 pt-6">
            <button
              type="button"
              (click)="onCancel()"
              class="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="isLoading()"
              class="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {{ isLoading() ? 'Guardando...' : 'Guardar dirección' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class AddressModalComponent {
  isOpen = signal(false);
  isLoading = signal(false);
  @Output() onAddressAdded = new EventEmitter<AddressCreateRequest>();
  @Output() onClosed = new EventEmitter<void>();

  form: AddressCreateRequest = {
    direccion: '',
    codigoPostal: '',
    ciudad: '',
    pais: '',
  };

  constructor(private userService: UserService) {}

  open(): void {
    this.isOpen.set(true);
  }

  onSubmit(): void {
    if (!this.form.direccion.trim() || !this.form.codigoPostal.trim() || !this.form.ciudad.trim() || !this.form.pais.trim()) {
      return;
    }

    this.isLoading.set(true);

    // Add address via UserService
    this.userService.addAddress(this.form).subscribe({
      next: () => {
        this.onAddressAdded.emit(this.form);
        this.resetForm();
        this.close();
      },
      error: () => {
        this.isLoading.set(false);
        // Error handling could be added here
      }
    });
  }

  onCancel(): void {
    this.close();
    this.onClosed.emit();
  }

  private close(): void {
    this.isOpen.set(false);
  }

  private resetForm(): void {
    this.form = {
      direccion: '',
      codigoPostal: '',
      ciudad: '',
      pais: '',
    };
    this.isLoading.set(false);
  }
}
