import { Injectable } from '@angular/core';
import { CLUB_IMAGE_URL } from '../config';
import { XeicEvent, EventType } from '../models/event.model';
import { StravaGroupEvent } from '../models/strava.model';

@Injectable({ providedIn: 'root' })
export class EventMergeService {
  isStrictlyBeforeToday(date: Date, now: Date = new Date()): boolean {
    return this.toYmd(date) < this.toYmd(now);
  }

  mergeUpcomingEvents(groupEvents: StravaGroupEvent[], sheetEvents: XeicEvent[]): XeicEvent[] {
    if (groupEvents.length > 0) {
      return groupEvents
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
    }

    return sheetEvents
      .filter((e) => !this.isStrictlyBeforeToday(e.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  stravaToXeicEvent(e: StravaGroupEvent, sheetEvents: XeicEvent[]): XeicEvent {
    const date = new Date(e.upcoming_occurrences[0]);
    const sheetMatch = sheetEvents.find(
      (s) => s.title.trim().toLowerCase() === e.title.trim().toLowerCase(),
    );
    return {
      id: `strava-${e.id}`,
      title: e.title,
      date,
      time: date.toTimeString().slice(0, 5),
      location: e.address || 'La Sénia',
      type: this.mapActivityType(e.activity_type),
      difficulty: 'Iniciació',
      tags: sheetMatch?.tags?.length
        ? sheetMatch.tags
        : [this.mapActivityTag(e.activity_type, e.title)],
      imageUrl: sheetMatch?.imageUrl ?? CLUB_IMAGE_URL,
      description: sheetMatch?.description ?? e.description ?? undefined,
    };
  }

  mapActivityType(activityType: string): EventType {
    const map: Record<string, EventType> = {
      Run: 'training',
      TrailRun: 'race',
      Walk: 'social',
      Hike: 'social',
      Ride: 'training',
    };
    return map[activityType] ?? 'social';
  }

  mapActivityTag(activityType: string, title: string): string {
    const t = title.toLowerCase();
    if (t.includes('trail')) return 'Trail';
    if (t.includes('senderisme') || t.includes('hike')) return 'Senderisme';
    if (t.includes('caminada') || t.includes('walk')) return 'Caminada';

    const map: Record<string, string> = {
      Run: 'Cursa',
      Walk: 'Caminada',
      Hike: 'Senderisme',
    };
    return map[activityType] || activityType || 'Social';
  }

  private toYmd(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  }
}
