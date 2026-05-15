import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XeicEvent } from '../../../core/models/event.model';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
})
export class EventCardComponent {
  @Input({ required: true }) event!: XeicEvent;
  @Input() hideMeta = false;
  protected i18n = inject(I18nService);

  private readonly localeMap: Record<string, string> = {
    ca: 'ca-ES',
    es: 'es-ES',
    en: 'en-US',
  };

  get locale(): string {
    return this.localeMap[this.i18n.currentLang()] ?? 'ca-ES';
  }

  monthLabel(date: Date): string {
    return date.toLocaleDateString(this.locale, { month: 'short' }).replace('.', '').toUpperCase();
  }

  dayLabel(date: Date): string {
    return date.toLocaleDateString(this.locale, { day: 'numeric' });
  }

  tagClass(tag: string): string {
    const primary = ['Xeic!', 'Cursa', 'Trail'];
    const tertiary = ['Iniciació', 'Mig', 'Muntanya', 'Senderisme'];
    const secondary = ['Asfalt', 'Social', 'Comunitat', 'Caminada'];
    if (primary.includes(tag)) return 'event-tag event-tag--primary';
    if (tertiary.includes(tag)) return 'event-tag event-tag--tertiary';
    if (secondary.includes(tag)) return 'event-tag event-tag--secondary';
    return 'event-tag event-tag--default';
  }
}
