import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaymentMethod } from '../../models/payment.model';
import { UserService } from '../../services/user.service';
import { TranslateService } from '../../services/translate.service';

@Component({
	selector: 'app-subscription',
	imports: [RouterLink],
	templateUrl: './subscription.html',
})
export class Subscription implements OnInit {
	readonly subscriptionPrice = 9.99;
	readonly processing = signal(false);
	readonly errorMessage = signal<string | null>(null);
	readonly showConfirmation = signal(false);
	readonly selectedPaymentId = signal<number | null>(null);
	readonly chargePreview = signal<number>(0);

	readonly benefits = [
		'15% de descuento en todos los pedidos',
		'Acceso a platos exclusivos y ediciones limitadas',
		'Prioridad en la preparación y entrega',
		'Soporte preferente y promociones privadas',
	];

	readonly plans = [
		{
			name: 'Básico',
			price: null,
			description: 'Perfecto para empezar y explorar el catálogo.',
			features: ['Acceso al catálogo completo', 'Seguimiento de pedidos', 'Métodos de pago guardados'],
		},
		{
			name: 'Premium',
			price: 9.99,
			description: 'La mejor opción si pides con frecuencia.',
			features: ['15% descuento', 'Platos exclusivos', 'Prioridad en envíos', 'Atención premium'],
		},
	];

	readonly faqs = [
		{
			q: 'Puedo cancelar en cualquier momento?',
			a: 'Sí, la membresía se puede cancelar cuando quieras sin penalizaciones.',
		},
		{
			q: 'La suscripción afecta a todos los pedidos?',
			a: 'Sí, el descuento Premium se aplica automáticamente al carrito mientras esté activa.',
		},
		{
			q: 'Necesito tener cuenta para activarla?',
			a: 'Sí, recomendamos iniciar sesión para guardar beneficios y métodos de pago.',
		},
	];

	constructor(
		public userService: UserService,
		public translateService: TranslateService
	) {}

	ngOnInit(): void {
		this.userService.fetchPaymentMethods();
	}

	get selectedPayment(): PaymentMethod | null {
		const selectedId = this.selectedPaymentId() ?? this.userService.defaultPaymentId();
		if (selectedId === null) {
			return null;
		}

		return this.userService.paymentMethods().find((method) => method.id === selectedId) ?? null;
	}

	activatePremium(): void {
		this.errorMessage.set(null);

		if (this.userService.paymentMethods().length === 0) {
			this.errorMessage.set('Necesitas guardar una tarjeta antes de activar Premium.');
			return;
		}

		const chosenPayment = this.selectedPayment;
		if (!chosenPayment) {
			this.errorMessage.set('Selecciona una tarjeta para continuar.');
			return;
		}

		// El backend validará el saldo disponible
		this.chargePreview.set(this.subscriptionPrice);
		this.showConfirmation.set(true);
	}

	cancelConfirmation(): void {
		this.showConfirmation.set(false);
		this.processing.set(false);
	}

	confirmPremium(): void {
		const chosenPayment = this.selectedPayment;
		if (!chosenPayment) {
			this.errorMessage.set('Selecciona una tarjeta para continuar.');
			this.showConfirmation.set(false);
			return;
		}

		this.processing.set(true);
		this.userService.subscribePremium(chosenPayment.id).subscribe({
			next: () => {
				this.showConfirmation.set(false);
				this.processing.set(false);
				this.errorMessage.set(null);
			},
			error: (err) => {
				const errorMsg = err?.error?.message || 'No se pudo completar la suscripción. Por favor, intenta de nuevo.';
				this.errorMessage.set(errorMsg);
				this.showConfirmation.set(false);
				this.processing.set(false);
			},
		});
	}
}
