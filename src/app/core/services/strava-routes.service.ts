import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, catchError, of, map } from 'rxjs';
import { XeicRoute } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class StravaRoutesService {
  private readonly http = inject(HttpClient);
  private readonly cache$: Observable<XeicRoute[]> = this.http
    .get<{ routes: XeicRoute[] }>('/api/routes')
    .pipe(
      map((res) => res.routes ?? []),
      shareReplay(1),
      catchError((err) => {
        console.warn(
          '[StravaRoutesService] Error carregant rutes:',
          err.message,
        );
        return of<XeicRoute[]>([]);
      }),
    );

  getRoutes(): Observable<XeicRoute[]> {
    return this.cache$;
  }
}
