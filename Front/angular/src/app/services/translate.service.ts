import { Injectable, signal } from '@angular/core';

type Lang = 'en' | 'de' | 'it' | 'fr' | 'es';
type CurrencyCode = 'EUR' | 'GBP';

const TRANSLATIONS: Record<Lang, any> = {
  en: {
    nav: {
      home: 'Home',
      menus: 'Menus',
      dishes: 'Dishes',
      subscription: 'Subscription',
      about: 'About',
      cart: 'Cart',
      login: 'Log in',
      signup: 'Sign up',
      menu: 'Menu',
      close: 'Close',
      profile: 'My profile',
      premium: 'Premium',
      cancel: 'Cancel',
    },
    cart: {
      title: 'Your cart',
      empty: 'Your cart is empty.',
      price: 'Price',
      quantity: 'Quantity',
      remove: 'Remove',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      discount: 'Premium discount',
      total: 'Total',
      checkout: 'Pay now',
      continue: 'Continue shopping',
    },
    payment: {
      add_card: 'Add Payment Method',
      card_type: 'Card Type',
      card_number: 'Card Number',
      card_holder: 'Cardholder Name',
      expiry: 'Expiration Date',
      card_saved: 'Your card will be saved and set as default payment method',
    },
    footer: {
      tagline: 'Flavors of the world at your door.',
    },
    auth: {
      backHome: 'Back to home',
      leftTitle: 'Discover new flavors.',
      leftSubtitle: 'The fastest and most reliable food delivery platform.',
      titleLogin: 'Welcome back',
      titleSignup: 'Create your account',
      subtitleLogin: 'Enter your credentials to continue.',
      subtitleSignup: 'Start ordering in seconds.',
      namePlaceholder: 'Full name',
      usernamePlaceholder: 'Username',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Password',
      hide: 'Hide',
      show: 'Show',
      loading: 'Loading...',
      loginAction: 'Log in',
      createAction: 'Create account',
      noAccount: 'No account yet?',
      haveAccount: 'Already have an account?',
      registerNow: 'Sign up',
      loginNow: 'Log in',
    },
    home: {
      freeDelivery: 'Free delivery on your first order',
      heroLine1: 'Flavors of the world,',
      heroLine2: 'straight to your table.',
      heroDesc: 'Discover a unique food experience with international menus and dishes ready to order in minutes.',
      ctaMenu: 'Build my menu',
      ctaDishes: 'See dishes',
      featuredTitle: 'Featured dishes',
      faqTitle: 'Frequently asked questions',
      badges: {
        new: 'New',
        popular: 'Popular',
        recommended: 'Recommended',
      },
      faq: {
        q1: 'How long does my order take?',
        a1: 'Usually between 30 and 45 minutes, depending on area and demand.',
        q2: 'Are there vegetarian or vegan options?',
        a2: 'Yes, we have plant-based options in several categories.',
        q3: 'What does Premium include?',
        a3: 'Exclusive dishes, 15% discount, and priority delivery.',
      },
    },
    common: {
      countries: {
        mexicano: 'Mexican',
        japones: 'Japanese',
        italiano: 'Italian',
        indio: 'Indian',
        griego: 'Greek',
        espanol: 'Spanish',
        premium: 'Premium',
        todos: 'All',
      },
    },
    menus: {
      title: 'Build your menu',
      subtitle: 'Choose a category and add your favorite menu to the cart.',
      description: 'Three-course menu with starter, main, and dessert.',
      add: 'Add',
    },
    platos: {
      title: 'Our menu',
      subtitle: 'Explore international dishes and unlock premium selection.',
      searchPlaceholder: 'Search dishes...',
      premiumTitle: 'Premium Membership',
      premiumSubtitle: 'Unlock exclusive dishes and 15% discount.',
      premiumCta: 'Get Premium',
      rating: 'Rating',
      add: 'Add',
    },
  },
  de: {
    nav: {
      home: 'Startseite',
      menus: 'Menues',
      dishes: 'Gerichte',
      subscription: 'Abonnement',
      about: 'Ueber uns',
      cart: 'Warenkorb',
      login: 'Anmelden',
      signup: 'Registrieren',
      menu: 'Menue',
      close: 'Schliessen',
      profile: 'Mein Profil',
      premium: 'Premium',
      cancel: 'Abbrechen',
    },
    cart: {
      title: 'Ihr Warenkorb',
      empty: 'Ihr Warenkorb ist leer.',
      price: 'Preis',
      quantity: 'Menge',
      remove: 'Entfernen',
      subtotal: 'Zwischensumme',
      shipping: 'Versand',
      discount: 'Premium-Rabatt',
      total: 'Gesamt',
      checkout: 'Jetzt bezahlen',
      continue: 'Weiter einkaufen',
    },
    payment: {
      add_card: 'Zahlungsmethode hinzufuegen',
      card_type: 'Kartentyp',
      card_number: 'Kartennummer',
      card_holder: 'Name des Karteninhabers',
      expiry: 'Ablaufdatum',
      card_saved: 'Ihre Karte wird gespeichert und als Standardzahlungsmethode festgelegt',
    },
    footer: {
      tagline: 'Aromen der Welt an Ihre Tuer.',
    },
    auth: {
      backHome: 'Zurueck zur Startseite',
      leftTitle: 'Entdecke neue Geschmaecker.',
      leftSubtitle: 'Die schnellste und zuverlaessigste Plattform fuer Essenslieferung.',
      titleLogin: 'Willkommen zurueck',
      titleSignup: 'Erstelle dein Konto',
      subtitleLogin: 'Gib deine Zugangsdaten ein, um fortzufahren.',
      subtitleSignup: 'Beginne in Sekunden zu bestellen.',
      namePlaceholder: 'Vollstaendiger Name',
      usernamePlaceholder: 'Benutzername',
      emailPlaceholder: 'E-Mail',
      passwordPlaceholder: 'Passwort',
      hide: 'Ausblenden',
      show: 'Anzeigen',
      loading: 'Laedt...',
      loginAction: 'Anmelden',
      createAction: 'Konto erstellen',
      noAccount: 'Noch kein Konto?',
      haveAccount: 'Hast du bereits ein Konto?',
      registerNow: 'Registrieren',
      loginNow: 'Anmelden',
    },
    home: {
      freeDelivery: 'Kostenlose Lieferung bei Ihrer ersten Bestellung',
      heroLine1: 'Aromen der Welt,',
      heroLine2: 'direkt auf Ihren Tisch.',
      heroDesc: 'Entdecken Sie ein einzigartiges Erlebnis mit internationalen Menues und Gerichten in wenigen Minuten.',
      ctaMenu: 'Mein Menue erstellen',
      ctaDishes: 'Gerichte ansehen',
      featuredTitle: 'Empfohlene Gerichte',
      faqTitle: 'Hauefige Fragen',
      badges: {
        new: 'Neu',
        popular: 'Beliebt',
        recommended: 'Empfohlen',
      },
      faq: {
        q1: 'Wie lange dauert meine Bestellung?',
        a1: 'Normalerweise 30 bis 45 Minuten, je nach Gebiet und Nachfrage.',
        q2: 'Gibt es vegetarische oder vegane Optionen?',
        a2: 'Ja, wir haben in mehreren Kategorien pflanzliche Optionen.',
        q3: 'Was beinhaltet Premium?',
        a3: 'Exklusive Gerichte, 15% Rabatt und prioritaere Lieferung.',
      },
    },
    common: {
      countries: {
        mexicano: 'Mexikanisch',
        japones: 'Japanisch',
        italiano: 'Italienisch',
        indio: 'Indisch',
        griego: 'Griechisch',
        espanol: 'Spanisch',
        premium: 'Premium',
        todos: 'Alle',
      },
    },
    menus: {
      title: 'Menue zusammenstellen',
      subtitle: 'Waehle eine Kategorie und fuege dein Lieblingsmenue zum Warenkorb hinzu.',
      description: 'Drei-Gaenge-Menue mit Vorspeise, Hauptgericht und Dessert.',
      add: 'Hinzufuegen',
    },
    platos: {
      title: 'Unsere Karte',
      subtitle: 'Entdecke internationale Gerichte und schalte Premium-Auswahl frei.',
      searchPlaceholder: 'Gerichte suchen...',
      premiumTitle: 'Premium-Mitgliedschaft',
      premiumSubtitle: 'Exklusive Gerichte und 15% Rabatt freischalten.',
      premiumCta: 'Premium holen',
      rating: 'Bewertung',
      add: 'Hinzufuegen',
    },
  },
  it: {
    nav: {
      home: 'Home',
      menus: 'Menu',
      dishes: 'Piatti',
      subscription: 'Abbonamento',
      about: 'Chi siamo',
      cart: 'Carrello',
      login: 'Accedi',
      signup: 'Registrati',
      menu: 'Menu',
      close: 'Chiudi',
      profile: 'Il mio profilo',
      premium: 'Premium',
      cancel: 'Annulla',
    },
    cart: {
      title: 'Il tuo carrello',
      empty: 'Il carrello e vuoto.',
      price: 'Prezzo',
      quantity: 'Quantita',
      remove: 'Rimuovi',
      subtotal: 'Subtotale',
      shipping: 'Spedizione',
      discount: 'Sconto premium',
      total: 'Totale',
      checkout: 'Paga ora',
      continue: 'Continua a comprare',
    },
    payment: {
      add_card: 'Aggiungi metodo di pagamento',
      card_type: 'Tipo di carta',
      card_number: 'Numero carta',
      card_holder: 'Nome del titolare',
      expiry: 'Data di scadenza',
      card_saved: 'La tua carta verra salvata e impostata come metodo di pagamento predefinito',
    },
    footer: {
      tagline: 'Sapori dal mondo, alla tua porta.',
    },
    auth: {
      backHome: 'Torna alla home',
      leftTitle: 'Scopri nuovi sapori.',
      leftSubtitle: 'La piattaforma di consegna cibo piu veloce e affidabile.',
      titleLogin: 'Bentornato',
      titleSignup: 'Crea il tuo account',
      subtitleLogin: 'Inserisci le tue credenziali per continuare.',
      subtitleSignup: 'Inizia a ordinare in pochi secondi.',
      namePlaceholder: 'Nome completo',
      usernamePlaceholder: 'Nome utente',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Password',
      hide: 'Nascondi',
      show: 'Mostra',
      loading: 'Caricamento...',
      loginAction: 'Accedi',
      createAction: 'Crea account',
      noAccount: 'Non hai un account?',
      haveAccount: 'Hai gia un account?',
      registerNow: 'Registrati',
      loginNow: 'Accedi',
    },
    home: {
      freeDelivery: 'Consegna gratis al tuo primo ordine',
      heroLine1: 'Sapori dal mondo,',
      heroLine2: 'direttamente a tavola.',
      heroDesc: 'Scopri un esperienza culinaria unica con menu e piatti internazionali pronti in pochi minuti.',
      ctaMenu: 'Crea il mio menu',
      ctaDishes: 'Vedi piatti',
      featuredTitle: 'Piatti in evidenza',
      faqTitle: 'Domande frequenti',
      badges: {
        new: 'Nuovo',
        popular: 'Popolare',
        recommended: 'Consigliato',
      },
      faq: {
        q1: 'Quanto tempo impiega l ordine?',
        a1: 'Di solito tra 30 e 45 minuti, in base alla zona e alla domanda.',
        q2: 'Ci sono opzioni vegetariane o vegane?',
        a2: 'Si, abbiamo opzioni plant-based in varie categorie.',
        q3: 'Cosa include Premium?',
        a3: 'Piatti esclusivi, sconto del 15% e consegna prioritaria.',
      },
    },
    common: {
      countries: {
        mexicano: 'Messicano',
        japones: 'Giapponese',
        italiano: 'Italiano',
        indio: 'Indiano',
        griego: 'Greco',
        espanol: 'Spagnolo',
        premium: 'Premium',
        todos: 'Tutti',
      },
    },
    menus: {
      title: 'Crea il tuo menu',
      subtitle: 'Scegli una categoria e aggiungi il tuo menu preferito al carrello.',
      description: 'Menu di 3 portate con antipasto, principale e dessert.',
      add: 'Aggiungi',
    },
    platos: {
      title: 'Il nostro menu',
      subtitle: 'Esplora piatti internazionali e sblocca la selezione premium.',
      searchPlaceholder: 'Cerca piatti...',
      premiumTitle: 'Abbonamento Premium',
      premiumSubtitle: 'Sblocca piatti esclusivi e sconto del 15%.',
      premiumCta: 'Diventa Premium',
      rating: 'Valutazione',
      add: 'Aggiungi',
    },
  },
  fr: {
    nav: {
      home: 'Accueil',
      menus: 'Menus',
      dishes: 'Plats',
      subscription: 'Abonnement',
      about: 'A propos',
      cart: 'Panier',
      login: 'Se connecter',
      signup: "S'inscrire",
      menu: 'Menu',
      close: 'Fermer',
      profile: 'Mon profil',
      premium: 'Premium',
      cancel: 'Annuler',
    },
    cart: {
      title: 'Votre panier',
      empty: 'Votre panier est vide.',
      price: 'Prix',
      quantity: 'Quantite',
      remove: 'Supprimer',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      discount: 'Remise premium',
      total: 'Total',
      checkout: 'Payer maintenant',
      continue: 'Continuer vos achats',
    },
    payment: {
      add_card: 'Ajouter un moyen de paiement',
      card_type: 'Type de carte',
      card_number: 'Numero de carte',
      card_holder: 'Titulaire de la carte',
      expiry: 'Date d expiration',
      card_saved: 'Votre carte sera enregistree et definie comme methode de paiement par defaut',
    },
    footer: {
      tagline: 'Les saveurs du monde a votre porte.',
    },
    auth: {
      backHome: 'Retour a l accueil',
      leftTitle: 'Decouvrez de nouvelles saveurs.',
      leftSubtitle: 'La plateforme de livraison la plus rapide et fiable.',
      titleLogin: 'Bon retour',
      titleSignup: 'Creez votre compte',
      subtitleLogin: 'Entrez vos identifiants pour continuer.',
      subtitleSignup: 'Commencez a commander en quelques secondes.',
      namePlaceholder: 'Nom complet',
      usernamePlaceholder: 'Nom d’utilisateur',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Mot de passe',
      hide: 'Masquer',
      show: 'Afficher',
      loading: 'Chargement...',
      loginAction: 'Se connecter',
      createAction: 'Creer un compte',
      noAccount: 'Vous n avez pas de compte?',
      haveAccount: 'Vous avez deja un compte?',
      registerNow: 'Inscription',
      loginNow: 'Connexion',
    },
    home: {
      freeDelivery: 'Livraison gratuite sur votre premiere commande',
      heroLine1: 'Les saveurs du monde,',
      heroLine2: 'directement a votre table.',
      heroDesc: 'Decouvrez une experience culinaire unique avec des menus internationaux prets en quelques minutes.',
      ctaMenu: 'Creer mon menu',
      ctaDishes: 'Voir les plats',
      featuredTitle: 'Plats en vedette',
      faqTitle: 'Questions frequentes',
      badges: {
        new: 'Nouveau',
        popular: 'Populaire',
        recommended: 'Recommande',
      },
      faq: {
        q1: 'Combien de temps prend la commande?',
        a1: 'En general 30 a 45 minutes selon la zone et la demande.',
        q2: 'Y a-t-il des options vegetariennes ou veganes?',
        a2: 'Oui, nous avons des options vegetales dans plusieurs categories.',
        q3: 'Que comprend Premium?',
        a3: 'Plats exclusifs, remise de 15% et livraison prioritaire.',
      },
    },
    common: {
      countries: {
        mexicano: 'Mexicain',
        japones: 'Japonais',
        italiano: 'Italien',
        indio: 'Indien',
        griego: 'Grec',
        espanol: 'Espagnol',
        premium: 'Premium',
        todos: 'Tous',
      },
    },
    menus: {
      title: 'Composez votre menu',
      subtitle: 'Choisissez une categorie et ajoutez votre menu prefere au panier.',
      description: 'Menu en 3 etapes avec entree, plat principal et dessert.',
      add: 'Ajouter',
    },
    platos: {
      title: 'Notre carte',
      subtitle: 'Explorez les plats internationaux et debloquez la selection premium.',
      searchPlaceholder: 'Rechercher des plats...',
      premiumTitle: 'Adhesion Premium',
      premiumSubtitle: 'Debloquez des plats exclusifs et 15% de remise.',
      premiumCta: 'Devenir Premium',
      rating: 'Note',
      add: 'Ajouter',
    },
  },
  es: {
    nav: {
      home: 'Inicio',
      menus: 'Menus',
      dishes: 'Platos',
      subscription: 'Suscripcion',
      about: 'Nosotros',
      cart: 'Carrito',
      login: 'Iniciar sesion',
      signup: 'Registrarse',
      menu: 'Menu',
      close: 'Cerrar',
      profile: 'Mi perfil',
      premium: 'Premium',
      cancel: 'Cancelar',
    },
    cart: {
      title: 'Tu carrito',
      empty: 'Tu carrito esta vacio.',
      price: 'Precio',
      quantity: 'Cantidad',
      remove: 'Quitar',
      subtotal: 'Subtotal',
      shipping: 'Envio',
      discount: 'Descuento premium',
      total: 'Total',
      checkout: 'Pagar ahora',
      continue: 'Seguir comprando',
    },
    payment: {
      add_card: 'Agregar metodo de pago',
      card_type: 'Tipo de tarjeta',
      card_number: 'Numero de tarjeta',
      card_holder: 'Nombre del titular',
      expiry: 'Fecha de vencimiento',
      card_saved: 'Tu tarjeta se guardara y se establecera como metodo de pago predeterminado',
    },
    footer: {
      tagline: 'Sabores del mundo, en tu puerta.',
    },
    auth: {
      backHome: 'Volver a inicio',
      leftTitle: 'Descubre nuevos sabores.',
      leftSubtitle: 'La plataforma de comida a domicilio mas rapida y confiable.',
      titleLogin: 'Bienvenido de nuevo',
      titleSignup: 'Crea tu cuenta',
      subtitleLogin: 'Ingresa tus credenciales para continuar.',
      subtitleSignup: 'Empieza a pedir en segundos.',
      namePlaceholder: 'Nombre completo',
      usernamePlaceholder: 'Usuario',
      emailPlaceholder: 'Correo electronico',
      passwordPlaceholder: 'Contraseña',
      hide: 'Ocultar',
      show: 'Mostrar',
      loading: 'Cargando...',
      loginAction: 'Iniciar sesion',
      createAction: 'Crear cuenta',
      noAccount: 'No tienes cuenta?',
      haveAccount: 'Ya tienes una cuenta?',
      registerNow: 'Registrate',
      loginNow: 'Inicia sesion',
    },
    home: {
      freeDelivery: 'Entrega gratis en tu primer pedido',
      heroLine1: 'Sabores del mundo,',
      heroLine2: 'directo a tu mesa.',
      heroDesc: 'Descubre una experiencia culinaria unica con menus y platos internacionales listos para pedir en minutos.',
      ctaMenu: 'Crear mi menu',
      ctaDishes: 'Ver platos',
      featuredTitle: 'Platos destacados',
      faqTitle: 'Preguntas frecuentes',
      badges: {
        new: 'Nuevo',
        popular: 'Popular',
        recommended: 'Recomendado',
      },
      faq: {
        q1: 'Cuanto tarda en llegar mi pedido?',
        a1: 'Normalmente entre 30 y 45 minutos, segun zona y volumen de pedidos.',
        q2: 'Hay opciones vegetarianas o veganas?',
        a2: 'Si, tenemos opciones plant-based en varias categorias.',
        q3: 'Que incluye Premium?',
        a3: 'Incluye platos exclusivos, 15% de descuento y prioridad en envio.',
      },
    },
    common: {
      countries: {
        mexicano: 'Mexicano',
        japones: 'Japones',
        italiano: 'Italiano',
        indio: 'Indio',
        griego: 'Griego',
        espanol: 'Espanol',
        premium: 'Premium',
        todos: 'Todos',
      },
    },
    menus: {
      title: 'Construye tu menu',
      subtitle: 'Elige categoria y anade tu menu favorito al carrito.',
      description: 'Menu de 3 pasos con primer plato, principal y postre.',
      add: 'Anadir',
    },
    platos: {
      title: 'Nuestra carta',
      subtitle: 'Explora platos internacionales y desbloquea la seleccion premium.',
      searchPlaceholder: 'Buscar platos...',
      premiumTitle: 'Membresia Premium',
      premiumSubtitle: 'Desbloquea platos exclusivos y descuento del 15%.',
      premiumCta: 'Hazte Premium',
      rating: 'Rating',
      add: 'Anadir',
    },
  },
};

@Injectable({ providedIn: 'root' })
export class TranslateService {
  // Default to Spanish; allow overriding from localStorage
  current = signal<Lang>('es');

  constructor() {
    try {
      const saved = localStorage.getItem('lang') as Lang | null;
      if (saved && TRANSLATIONS[saved]) {
        this.current.set(saved);
      }
    } catch (e) {
      // ignore (e.g., SSR or privacy settings)
    }
  }

  get lang(): Lang {
    return this.current();
  }

  get currencyCode(): CurrencyCode {
    return this.lang === 'en' ? 'GBP' : 'EUR';
  }

  private get locale(): string {
    switch (this.lang) {
      case 'en':
        return 'en-GB';
      case 'de':
        return 'de-DE';
      case 'it':
        return 'it-IT';
      case 'fr':
        return 'fr-FR';
      case 'es':
      default:
        return 'es-ES';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currencyCode,
    }).format(amount);
  }

  setLanguage(lang: Lang) {
    if (TRANSLATIONS[lang]) {
      this.current.set(lang);
      try {
        localStorage.setItem('lang', lang);
      } catch (e) {
        // ignore storage errors
      }
    }
  }

  t(key: string): string {
    const parts = key.split('.');
    let node: any = TRANSLATIONS[this.lang];
    for (const p of parts) {
      if (!node) return key;
      node = node[p];
    }
    return typeof node === 'string' ? node : key;
  }
}
