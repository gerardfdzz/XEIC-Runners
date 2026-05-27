import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { StravaService } from '../../core/services/strava.service';
import { InstagramService } from '../../core/services/instagram.service';
import { EventsSheetService } from '../../core/services/events-sheet.service';
import { EventMergeService } from '../../core/services/event-merge.service';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { LightboxComponent } from '../../shared/components/lightbox/lightbox.component';
import { WHATSAPP_INVITE_URL } from '../../core/config';
import { XeicEvent } from '../../core/models/event.model';
import { InstagramItem } from '../../core/models/instagram.model';

@Component({
  selector: 'app-esdeveniments',
  standalone: true,
  imports: [CommonModule, DatePipe, EventCardComponent, LightboxComponent],
  templateUrl: './esdeveniments.component.html',
  styleUrl: './esdeveniments.component.scss',
})
export class EsdevenimentsComponent implements OnInit {
  protected i18n = inject(I18nService);
  private seo = inject(SeoService);
  private strava = inject(StravaService);
  private instagram = inject(InstagramService);
  private sheet = inject(EventsSheetService);
  private eventMerge = inject(EventMergeService);

  protected readonly whatsappUrl = WHATSAPP_INVITE_URL;

  upcoming: XeicEvent[] = [];
  past: XeicEvent[] = [];
  pastByMonth: { year: number; month: number; events: XeicEvent[] }[] = [];
  loading = true;
  selectedEvent = signal<XeicEvent | null>(null);
  showLightboxMeta = false;

  openLightbox(event: XeicEvent, showMeta = false): void {
    this.selectedEvent.set(event);
    this.showLightboxMeta = showMeta;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.selectedEvent.set(null);
    document.body.style.overflow = '';
  }

  private readonly localeMap: Record<string, string> = {
    ca: 'ca-ES', es: 'es-ES', en: 'en-US',
  };

  monthGroupLabel(year: number, month: number): string {
    const locale = this.localeMap[this.i18n.currentLang()] ?? 'ca-ES';
    const date = new Date(year, month, 1);
    const m = date.toLocaleDateString(locale, { month: 'long' });
    return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'Esdeveniments i Sortides · XEIC RUNNERS',
      description: 'Pròxims esdeveniments i sortides de XEIC RUNNERS a La Sénia i les Terres de l\'Ebre. Quedades setmanals de running, trail i senderisme obertes a tothom.',
      keywords: 'esdeveniments running La Sénia, sortides trail Terres de l\'Ebre, quedades running XEIC, events running Tarragona, senderisme La Sénia',
      ogImage: 'https://www.xeicrunners.com/assets/images/galeria/foto-xeic.jpg',
    });

    forkJoin({
      groupEvents: this.strava.getGroupEvents(),
      igItems: this.instagram.getHighlights(),
      sheetEvents: this.sheet.getEvents(),
    }).subscribe(({ groupEvents, igItems, sheetEvents }) => {
      this.loading = false;

      this.upcoming = this.eventMerge.mergeUpcomingEvents(
        groupEvents,
        sheetEvents,
      );

      const igPast = igItems
        .map((item) => this.instagramToXeicEvent(item))
        .filter((e) => this.eventMerge.isStrictlyBeforeToday(e.date));

      if (igPast.length > 0) {
        this.past = igPast.sort((a, b) => b.date.getTime() - a.date.getTime());
      } else {
        this.past = sheetEvents
          .filter((e) => this.eventMerge.isStrictlyBeforeToday(e.date))
          .sort((a, b) => b.date.getTime() - a.date.getTime());
      }

      this.pastByMonth = this.groupByMonth(this.past);
    });
  }

  private groupByMonth(events: XeicEvent[]): { year: number; month: number; events: XeicEvent[] }[] {
    const map = new Map<string, XeicEvent[]>();
    for (const e of events) {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).map(([key, evs]) => {
      const [year, month] = key.split('-').map(Number);
      return { year, month, events: evs };
    });
  }

  private instagramToXeicEvent(item: InstagramItem): XeicEvent {
    const date = new Date(item.takenAt * 1000);
    return {
      id: `ig-${item.id}`,
      title: 'Sortida XEIC Runners',
      date,
      time: date.toTimeString().slice(0, 5),
      location: 'La Sénia',
      type: 'training',
      difficulty: 'Iniciació',
      tags: ['Sortida'],
      imageUrl: item.imageUrl,
      ...(item.width && item.height ? { imageWidth: item.width, imageHeight: item.height } : {}),
    };
  }
}
