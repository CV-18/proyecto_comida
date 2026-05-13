import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { CartDrawer } from '../cart-drawer/cart-drawer';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Navbar, CartDrawer],
  templateUrl: './layout.html',
})
export class Layout {}
