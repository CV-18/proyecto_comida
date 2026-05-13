import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home.html',
})
export class Home {
  openFaq = 0;

  readonly categories = ['Mexicano', 'Japones', 'Italiano', 'Indio', 'Griego', 'Espanol'];

  readonly featured = [
    {
      title: 'Autentica Paella Espanola',
      badge: 'new',
      price: 16.0,
      image: 'https://images.unsplash.com/photo-1602755088318-39b7a7e6482a?q=80&w=1400&auto=format&fit=crop',
    },
    {
      title: 'Pasta Fresca Italiana',
      badge: 'popular',
      price: 11.95,
      image: 'https://images.unsplash.com/photo-1739417083034-4e9118f487be?q=80&w=1400&auto=format&fit=crop',
    },
    {
      title: 'Sushi Premium Selection',
      badge: 'recommended',
      price: 18.0,
      image: 'https://images.unsplash.com/photo-1664882589261-498d42a9ad44?q=80&w=1400&auto=format&fit=crop',
    },
  ];

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

  constructor(public translateService: TranslateService) {}

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? -1 : index;
  }
}
