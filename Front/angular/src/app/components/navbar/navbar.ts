import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { TranslateService } from '../../services/translate.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CartService } from '../../services/cart.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.html',
})
export class Navbar {
  mobileMenuOpen = false;
  languageMenuOpen = false;
  mobileLanguageMenuOpen = false;
  readonly languageOptions = [
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'en', flag: '🇺🇸', label: 'EN' },
    { code: 'de', flag: '🇩🇪', label: 'DE' },
    { code: 'it', flag: '🇮🇹', label: 'IT' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
  ] as const;

  constructor(
    public cart: CartService,
    public userService: UserService
    , public translateService: TranslateService
    , public authService: AuthService
    , private readonly router: Router
  ) {}

  getInitials(): string {
    const user = this.userService.user();
    if (!user) {
      return '??';
    }

    return user
      .name.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.languageMenuOpen = false;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.mobileLanguageMenuOpen = false;
  }

  toggleMobileLanguageMenu(): void {
    this.mobileLanguageMenuOpen = !this.mobileLanguageMenuOpen;
  }

  openCart(): void {
    this.cart.isCartOpen.set(true);
  }

  toggleLanguageMenu(): void {
    this.languageMenuOpen = !this.languageMenuOpen;
  }

  closeLanguageMenu(): void {
    this.languageMenuOpen = false;
  }

  changeLanguage(lang: string): void {
    if (lang === 'es' || lang === 'en' || lang === 'de' || lang === 'it' || lang === 'fr') {
      this.translateService.setLanguage(lang);
    }
    this.closeLanguageMenu();
  }

  getCurrentLanguage(): { code: string; flag: string; label: string } {
    return this.languageOptions.find((lang) => lang.code === this.translateService.lang) ?? this.languageOptions[0];
  }

  logout(): void {
    this.userService.logout();
    this.closeLanguageMenu();
    this.closeMobileMenu();
    void this.router.navigateByUrl('/');
  }
}
