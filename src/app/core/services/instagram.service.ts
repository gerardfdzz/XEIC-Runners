import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, catchError, of, map } from 'rxjs';
import {
  InstagramItem,
  InstagramHighlightsResponse,
} from '../models/instagram.model';

@Injectable({ providedIn: 'root' })
export class InstagramService {
  private readonly http = inject(HttpClient);

  private readonly data$: Observable<InstagramItem[]> = this.http
    .get<InstagramHighlightsResponse>('/api/instagram')
    .pipe(
      map((res) => res.items ?? []),
      shareReplay(1),
      catchError((err) => {
        console.warn(
          "[InstagramService] No s'han pogut obtenir les highlights:",
          err.message,
        );
        return of<InstagramItem[]>([]);
      }),
    );

  getHighlights(): Observable<InstagramItem[]> {
    return this.data$;
  }
}
