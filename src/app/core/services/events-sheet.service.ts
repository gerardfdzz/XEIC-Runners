import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, catchError, of, map } from 'rxjs';
import { XeicEvent, EventType, EventDifficulty } from '../models/event.model';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_zumu8Ihv7DIuX7n_BUzxvCpGng5qBTbGDY7rEU1jbAyTJ1COy1d8tZdkZZmLv5znhVtAoe22xJtU/pub?gid=0&single=true&output=csv';

@Injectable({ providedIn: 'root' })
export class EventsSheetService {
  private readonly http = inject(HttpClient);

  getEvents(): Observable<XeicEvent[]> {
    if (!SHEET_CSV_URL) {
      return of([]);
    }

    return this.http.get(SHEET_CSV_URL, { responseType: 'text' }).pipe(
      map((csv) => this.parseCsv(csv)),
      shareReplay(1),
      catchError((err) => {
        console.warn('[EventsSheetService] Error carregant el Google Sheet:', err.message);
        return of<XeicEvent[]>([]);
      })
    );
  }

  private parseCsv(csv: string): XeicEvent[] {
    const lines  = csv.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCsvRow(lines[0]).map((h) => h.trim().toLowerCase());
    const events: XeicEvent[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols  = this.parseCsvRow(lines[i]);
      const row   = Object.fromEntries(headers.map((h, j) => [h, (cols[j] ?? '').trim()]));

      if (!row['title'] || !row['date'] || !row['imageurl']) continue;

      const date = this.parseDate(row['date']);
      if (!date) continue;

      const type: EventType       = this.validType(row['type']);
      const difficulty: EventDifficulty = this.validDifficulty(row['difficulty']);
      const tags: string[]        = row['tags']
        ? row['tags'].split('|').map((t) => t.trim()).filter(Boolean)
        : [type];

      events.push({
        id:              `sheet-${i}-${date.getTime()}`,
        title:           row['title'],
        date,
        time:            row['time']            || '00:00',
        location:        row['location']        || 'La Sénia',
        type,
        difficulty,
        tags,
        imageUrl:        row['imageurl'],
        distance:        row['distance']        || undefined,
        elevationGain:   row['elevationgain']   || undefined,
        description:     row['description']     || undefined,
        registrationUrl: row['registrationurl'] || undefined,
      });
    }

    return events;
  }

  private parseCsvRow(line: string): string[] {
    const result: string[] = [];
    let cur   = '';
    let inQt  = false;

    for (let i = 0; i < line.length; i++) {
      const ch   = line[i];
      const next = line[i + 1];

      if (inQt) {
        if (ch === '"' && next === '"') { cur += '"'; i++; }
        else if (ch === '"')           { inQt = false; }
        else                           { cur += ch; }
      } else {
        if      (ch === '"')  { inQt = true; }
        else if (ch === ',')  { result.push(cur); cur = ''; }
        else                  { cur += ch; }
      }
    }
    result.push(cur);
    return result;
  }

  private parseDate(raw: string): Date | null {
    const parts = raw.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    return new Date(y, m - 1, d);
  }

  private validType(raw: string): EventType {
    const allowed: EventType[] = ['training', 'race', 'social', 'track'];
    return allowed.includes(raw as EventType) ? (raw as EventType) : 'social';
  }

  private validDifficulty(raw: string): EventDifficulty {
    const allowed: EventDifficulty[] = ['Iniciació', 'Mitjà', 'Xeic!'];
    return allowed.includes(raw as EventDifficulty) ? (raw as EventDifficulty) : 'Iniciació';
  }
}
