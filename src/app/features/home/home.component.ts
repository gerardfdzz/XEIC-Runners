import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { StravaRoutesService } from '../../core/services/strava-routes.service';
import { StravaService } from '../../core/services/strava.service';
import { EventsSheetService } from '../../core/services/events-sheet.service';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { XeicEvent, EventType } from '../../core/models/event.model';
import { XeicRoute } from '../../core/models/route.model';
import { StravaGroupEvent } from '../../core/models/strava.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, EventCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  protected i18n = inject(I18nService);
  private seo = inject(SeoService);
  private routesService = inject(StravaRoutesService);
  private strava = inject(StravaService);
  private sheet = inject(EventsSheetService);

  upcomingEvents = signal<XeicEvent[]>([]);
  featuredRoutes = signal<XeicRoute[]>([]);
  routeCount = signal<string>('...');
  memberCount = signal<string>('...');

  private readonly CLUB_IMAGE =
    'https://www.xeicrunners.com/assets/images/galeria/foto-xeic.jpg';

  scrollToOrigen(): void {
    document.getElementById('origen')?.scrollIntoView({ behavior: 'smooth' });
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'XEIC RUNNERS · El club de running social de La Sénia',
      description: 'XEIC RUNNERS és el club de running de La Sénia i les Terres de l\'Ebre. Més de 130 membres, sortides setmanals per muntanya i carretera. Uneix-te ara!',
      keywords: 'running La Sénia, club running Terres de l\'Ebre, trail running Parc Natural dels Ports, XEIC RUNNERS, running social, club esportiu La Sénia, running Tarragona',
    });

    this.routesService.getRoutes().subscribe((routes) => {
      this.featuredRoutes.set(routes.slice(0, 4));
      this.routeCount.set(routes.length > 0 ? `${routes.length}` : '∞');
    });

    this.strava.getData().subscribe((data) => {
      if (data?.club?.member_count) {
        this.memberCount.set(`${data.club.member_count}`);
      }
    });

    forkJoin({
      groupEvents: this.strava.getGroupEvents(),
      sheetEvents: this.sheet.getEvents(),
    }).subscribe(({ groupEvents, sheetEvents }) => {
      let upcoming: XeicEvent[];

      if (groupEvents.length > 0) {
        upcoming = groupEvents
          .filter(
            (e) =>
              e.upcoming_occurrences?.length > 0 &&
              !this.isStrictlyBeforeToday(new Date(e.upcoming_occurrences[0])),
          )
          .sort(
            (a, b) =>
              new Date(a.upcoming_occurrences[0]).getTime() -
              new Date(b.upcoming_occurrences[0]).getTime(),
          )
          .map((e) => this.stravaToXeicEvent(e, sheetEvents));
      } else {
        upcoming = sheetEvents
          .filter((e) => !this.isStrictlyBeforeToday(e.date))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
      }

      this.upcomingEvents.set(upcoming.slice(0, 3));
    });
  }

  private isStrictlyBeforeToday(date: Date): boolean {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    return toStr(date) < toStr(new Date());
  }

  private stravaToXeicEvent(
    e: StravaGroupEvent,
    sheetEvents: XeicEvent[],
  ): XeicEvent {
    const date = new Date(e.upcoming_occurrences[0]);
    const typeMap: Record<string, EventType> = {
      Run: 'training',
      TrailRun: 'race',
      Walk: 'social',
      Hike: 'social',
      Ride: 'training',
    };
    const sheetMatch = sheetEvents.find(
      (s) => s.title.trim().toLowerCase() === e.title.trim().toLowerCase(),
    );
    return {
      id: `strava-${e.id}`,
      title: e.title,
      date,
      time: date.toTimeString().slice(0, 5),
      location: e.address || 'La Sénia',
      type: typeMap[e.activity_type] ?? 'social',
      difficulty: 'Iniciació',
      tags: sheetMatch?.tags?.length
        ? sheetMatch.tags
        : [this.mapActivityTag(e.activity_type, e.title)],
      imageUrl: sheetMatch?.imageUrl ?? this.CLUB_IMAGE,
      description: sheetMatch?.description ?? e.description ?? undefined,
    };
  }

  private mapActivityTag(activityType: string, title: string): string {
    const t = title.toLowerCase();
    if (t.includes('trail')) return 'Trail';
    if (t.includes('senderisme') || t.includes('hike')) return 'Senderisme';
    if (t.includes('caminada') || t.includes('walk')) return 'Caminada';
    const map: Record<string, string> = {
      Run: 'Cursa',
      Walk: 'Caminada',
      Hike: 'Senderisme',
    };
    return map[activityType] ?? activityType ?? 'Social';
  }
}
