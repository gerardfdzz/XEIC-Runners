import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, catchError, of, map } from 'rxjs';
import { StravaData, StravaClub, StravaActivity, StravaGroupEvent } from '../models/strava.model';

@Injectable({ providedIn: 'root' })
export class StravaService {
  private readonly http = inject(HttpClient);
  
  private readonly data$: Observable<StravaData | null> = this.http
    .get<StravaData>('/api/strava')
    .pipe(
      shareReplay(1),
      catchError((err) => {
        console.warn('[StravaService] No s\'ha pogut obtenir dades de Strava:', err.message);
        return of(null);
      })
    );

  getData(): Observable<StravaData | null> {
    return this.data$;
  }

  getClub(): Observable<StravaClub | null> {
    return this.data$.pipe(map((d) => d?.club ?? null));
  }

  getActivities(): Observable<StravaActivity[]> {
    return this.data$.pipe(map((d) => d?.activities ?? []));
  }

  getGroupEvents(): Observable<StravaGroupEvent[]> {
    return this.data$.pipe(map((d) => d?.groupEvents ?? []));
  }

  static formatDistance(metres: number): string {
    return (metres / 1000).toFixed(1);
  }

  static formatTime(seconds: number): string {
    const h   = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${min}min`;
    return `${min}min`;
  }
}
