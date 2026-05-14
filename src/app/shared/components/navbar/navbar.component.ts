import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { I18nService, Language } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  protected i18n = inject(I18nService);
  protected mobileMenuOpen = signal(false);
  protected langMenuOpen = signal(false);
  protected scrolled = signal(false);

  protected langs: { code: Language; label: string }[] = [
    { code: 'ca', label: 'Català' },
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 20);
  }

  protected setLang(lang: Language): void {
    this.i18n.setLanguage(lang);
    this.langMenuOpen.set(false);
  }
}
