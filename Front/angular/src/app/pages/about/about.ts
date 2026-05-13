import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-about',
	imports: [RouterLink],
	templateUrl: './about.html',
})
export class About {
	readonly metrics = [
		{ value: '120+', label: 'platos y menús disponibles' },
		{ value: '30-45 min', label: 'tiempo de entrega' },
		{ value: '4.8/5', label: 'satisfacción de clientes' },
	];
}
