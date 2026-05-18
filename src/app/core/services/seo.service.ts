import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';

export interface SeoPage {
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  ogType?: string;
}

const BASE_URL = 'https://www.xeicrunners.com';
const DEFAULT_OG_IMAGE =
  'https://www.xeicrunners.com/assets/images/galeria/foto-xeic.jpg';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private titleService = inject(Title);
  private router = inject(Router);

  update(page: SeoPage): void {
    const canonical = `${BASE_URL}${this.router.url.split('?')[0]}`;
    const ogImage = page.ogImage ?? DEFAULT_OG_IMAGE;
    const ogType = page.ogType ?? 'website';

    this.titleService.setTitle(page.title);

    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'keywords', content: page.keywords });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });

    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({
      property: 'og:description',
      content: page.description,
    });
    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:site_name', content: 'XEIC RUNNERS' });
    this.meta.updateTag({ property: 'og:locale', content: 'ca_ES' });

    this.meta.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({
      name: 'twitter:description',
      content: page.description,
    });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });
    this.meta.updateTag({ name: 'twitter:site', content: '@xeicrunners' });

    this.setCanonical(canonical);
  }

  private setCanonical(url: string): void {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
