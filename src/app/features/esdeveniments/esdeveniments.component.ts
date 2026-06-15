import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, EventCardComponent, LightboxComponent],
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

  protected upcoming: XeicEvent[] = [];
  protected past: XeicEvent[] = [];
  protected pastByMonth: { year: number; month: number; events: XeicEvent[] }[] = [];
  protected pastByYear: { year: number; months: { month: number; events: XeicEvent[] }[] }[] = [];
  protected loading = true;
  protected selectedEvent = signal<XeicEvent | null>(null);
  protected showLightboxMeta = false;

  private readonly expandedMonths = signal(new Map<number, number | null>());

  protected isMonthExpanded(year: number, month: number): boolean {
    return this.expandedMonths().get(year) === month;
  }

  protected toggleMonth(year: number, month: number): void {
    const next = new Map(this.expandedMonths());
    next.set(year, next.get(year) === month ? null : month);
    this.expandedMonths.set(next);
  }

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
    ca: 'ca-ES',
    es: 'es-ES',
    en: 'en-US',
  };

  monthGroupLabel(year: number, month: number): string {
    const locale = this.localeMap[this.i18n.currentLang()] ?? 'ca-ES';
    const date = new Date(year, month, 1);
    const m = date.toLocaleDateString(locale, { month: 'long' });
    return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
  }

  protected monthLabel(year: number, month: number): string {
    const locale = this.localeMap[this.i18n.currentLang()] ?? 'ca-ES';
    const date = new Date(year, month, 1);
    const m = date.toLocaleDateString(locale, { month: 'long' });
    return `${m.charAt(0).toUpperCase()}${m.slice(1)}`;
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'Sortides i Esdeveniments · Running La Sénia · XEIC RUNNERS',
      description:
        "Pròximes sortides per correr a La Sénia amb XEIC RUNNERS. Quedades setmanals de running i trail pels Ports i les Terres de l'Ebre, obertes a tothom.",
      keywords:
        "sortides running La Sénia, La Sénia Correr, La Sénia Running, correr La Sénia, quedades running La Sénia, trail La Sénia, senderisme La Sénia, running Terres de l'Ebre, events running Tarragona",
      ogImage: 'https://www.xeicrunners.com/assets/images/galeria/foto-xeic.jpg',
    });

    forkJoin({
      groupEvents: this.strava.getGroupEvents(),
      igItems: this.instagram.getHighlights(),
      sheetEvents: this.sheet.getEvents(),
    }).subscribe(({ groupEvents, igItems, sheetEvents }) => {
      this.loading = false;

      this.upcoming = this.eventMerge.mergeUpcomingEvents(groupEvents, sheetEvents);

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
      this.pastByYear = this.groupByYear(this.pastByMonth);
      if (this.pastByMonth.length > 0) {
        const first = this.pastByMonth[0];
        this.expandedMonths.set(new Map([[first.year, first.month]]));
      }
    });
  }

  private groupByYear(
    byMonth: { year: number; month: number; events: XeicEvent[] }[],
  ): { year: number; months: { month: number; events: XeicEvent[] }[] }[] {
    const map = new Map<number, { month: number; events: XeicEvent[] }[]>();
    for (const g of byMonth) {
      if (!map.has(g.year)) map.set(g.year, []);
      map.get(g.year)!.push({ month: g.month, events: g.events });
    }
    return Array.from(map.entries()).map(([year, months]) => ({ year, months }));
  }

  private groupByMonth(
    events: XeicEvent[],
  ): { year: number; month: number; events: XeicEvent[] }[] {
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
