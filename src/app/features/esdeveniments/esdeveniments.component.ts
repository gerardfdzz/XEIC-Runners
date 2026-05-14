import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { I18nService } from '../../core/services/i18n.service';
import { StravaService } from '../../core/services/strava.service';
import { EventsDataService } from '../../core/services/events-data.service';
import { InstagramService } from '../../core/services/instagram.service';
import { EventsSheetService } from '../../core/services/events-sheet.service';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { XeicEvent, EventType } from '../../core/models/event.model';
import { StravaGroupEvent } from '../../core/models/strava.model';
import { InstagramItem } from '../../core/models/instagram.model';

const CLUB_IMAGE =
  'https://apropebre.cat/wp-content/uploads/2026/04/DSC09088-1024x683.jpg';

@Component({
  selector: 'app-esdeveniments',
  standalone: true,
  imports: [CommonModule, EventCardComponent],
  templateUrl: './esdeveniments.component.html',
  styleUrl: './esdeveniments.component.scss',
})
export class EsdevenimentsComponent implements OnInit {
  protected i18n = inject(I18nService);
  private strava = inject(StravaService);
  private eventsService = inject(EventsDataService);
  private instagram = inject(InstagramService);
  private sheet = inject(EventsSheetService);

  upcoming: XeicEvent[] = [];
  past: XeicEvent[] = [];
  loading = true;

  private isStrictlyBeforeToday(date: Date): boolean {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    return toStr(date) < toStr(new Date());
  }

  ngOnInit(): void {
    const now = new Date();

    forkJoin({
      groupEvents: this.strava.getGroupEvents(),
      igItems: this.instagram.getHighlights(),
      sheetEvents: this.sheet.getEvents(),
    }).subscribe(({ groupEvents, igItems, sheetEvents }) => {
      this.loading = false;

      if (groupEvents.length > 0) {
        this.upcoming = groupEvents
          .filter((e) => e.upcoming_occurrences?.length > 0)
          .sort(
            (a, b) =>
              new Date(a.upcoming_occurrences[0]).getTime() -
              new Date(b.upcoming_occurrences[0]).getTime(),
          )
          .map((e) => this.stravaToXeicEvent(e, sheetEvents));
      } else {
        const futursSheet = sheetEvents.filter(
          (e) => !this.isStrictlyBeforeToday(e.date),
        );
        this.upcoming =
          futursSheet.length > 0
            ? futursSheet.sort((a, b) => a.date.getTime() - b.date.getTime())
            : this.eventsService
                .getAll()
                .filter((e) => !this.isStrictlyBeforeToday(e.date))
                .sort((a, b) => a.date.getTime() - b.date.getTime());
      }

      const igPast = igItems
        .map((item) => this.instagramToXeicEvent(item))
        .filter((e) => this.isStrictlyBeforeToday(e.date));

      if (igPast.length > 0) {
        this.past = igPast.sort((a, b) => b.date.getTime() - a.date.getTime());
      } else {
        const passatsSheet = sheetEvents.filter((e) =>
          this.isStrictlyBeforeToday(e.date),
        );
        if (passatsSheet.length > 0) {
          this.past = passatsSheet.sort(
            (a, b) => b.date.getTime() - a.date.getTime(),
          );
        } else {
          this.past = this.eventsService
            .getAll()
            .filter((e) => this.isStrictlyBeforeToday(e.date))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        }
      }
    });
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
      tags: [this.mapActivityTag(e.activity_type, e.title)],
      imageUrl: sheetMatch?.imageUrl ?? CLUB_IMAGE,
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

  private instagramToXeicEvent(item: InstagramItem): XeicEvent {
    const date = new Date(item.takenAt * 1000);
    return {
      id: `ig-${item.id}`,
      title: 'Sortida XEIC Runners',
      date,
      time: date.toTimeString().slice(0, 5),
      location: 'La Sénia',
      type: 'training' as EventType,
      difficulty: 'Iniciació',
      tags: ['Sortida'],
      imageUrl: item.imageUrl,
    };
  }
}
