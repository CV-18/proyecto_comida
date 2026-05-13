import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { TranslateService } from '../../services/translate.service';

@Component({
	selector: 'app-subscription',
	imports: [RouterLink],
	templateUrl: './subscription.html',
})
export class Subscription {
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

	activatePremium(): void {
		this.userService.subscribePremium();
		this.userService.login();
	}
}
