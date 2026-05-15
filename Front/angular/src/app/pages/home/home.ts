import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { CatalogService } from '../../services/catalog.service';
import type { PlatoResponse } from '../../services/catalog-admin.service';

interface FeaturedPlato {
  id: number;
  title: string;
  badge: 'new' | 'popular' | 'recommended';
  price: number;
  image: string;
}

const featuredImages = [
  'https://images.unsplash.com/photo-1602755088318-39b7a7e6482a?q=80&w=1400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1739417083034-4e9118f487be?q=80&w=1400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1664882589261-498d42a9ad44?q=80&w=1400&auto=format&fit=crop',
];

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home.html',
})
export class Home {
  openFaq = 0;

  readonly categories = ['Mexicano', 'Japones', 'Italiano', 'Indio', 'Griego', 'Espanol'];

  featured: FeaturedPlato[] = [];

  readonly faqs = [
    {
      q: 'home.faq.q1',
      a: 'home.faq.a1',
    },
    {
      q: 'home.faq.q2',
      a: 'home.faq.a2',
    },
    {
      q: 'home.faq.q3',
      a: 'home.faq.a3',
    },
  ];

  constructor(
    public translateService: TranslateService,
    private readonly catalogService: CatalogService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.loadFeaturedPlatos();
  }

  private loadFeaturedPlatos(): void {
    this.catalogService.listPlatos().subscribe({
      next: (platos) => {
        this.featured = platos.slice(0, 3).map((plato, index) => this.toFeaturedPlato(plato, index));
        this.cdr.detectChanges();
      },
      error: () => {
        this.featured = [];
        this.cdr.detectChanges();
      }
    });
  }

  private toFeaturedPlato(plato: PlatoResponse, index: number): FeaturedPlato {
    const badge: FeaturedPlato['badge'] = index === 0 ? 'new' : index === 1 ? 'popular' : 'recommended';

    return {
      id: plato.id,
      title: plato.nombre,
      badge,
      price: plato.precio,
      image: featuredImages[index % featuredImages.length],
    };
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? -1 : index;
  }
}
