import { Routes } from '@angular/router';
import { Layout } from './components/layout/layout';
import { Home } from './pages/home/home';
import { Menus } from './pages/menus/menus';
import { Platos } from './pages/platos/platos';
import { Account } from './pages/account/account';
import { Auth } from './pages/auth/auth';
import { Subscription } from './pages/subscription/subscription';
import { About } from './pages/about/about';
import { Admin } from './pages/admin/admin';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
	{
		path: '',
		component: Layout,
		children: [
			{ path: '', component: Home },
			{ path: 'menus', component: Menus },
			{ path: 'platos', component: Platos },
			{ path: 'login', component: Auth },
			{ path: 'signup', component: Auth },
			{ path: 'account', component: Account },
			{ path: 'cuenta', component: Account },
			{ path: 'suscripcion', component: Subscription },
			{ path: 'about', component: About },
			{ path: 'nosotros', component: About },
			{ path: 'admin', component: Admin, canActivate: [adminGuard] },
			{ path: '**', redirectTo: '' },
		],
	},
];
