import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of, shareReplay, tap } from 'rxjs';

export type Language = 'ca' | 'es' | 'en';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly STORAGE_KEY = 'xeic-lang';
  private readonly SUPPORTED: Language[] = ['ca', 'es', 'en'];

  private _lang = signal<Language>(this.initialLang());
  private _translations = signal<Record<string, unknown>>({});
  private _loading = signal(false);
  private cache = new Map<Language, Record<string, unknown>>();
  private inflight = new Map<Language, Observable<Record<string, unknown>>>();

  currentLang = this._lang.asReadonly();
  translations = this._translations.asReadonly();
  loading = this._loading.asReadonly();

  langLabel = computed(() => {
    const labels: Record<Language, string> = { ca: 'CA', es: 'ES', en: 'EN' };
    return labels[this._lang()];
  });

  constructor(private http: HttpClient) {
    this.applyHtmlLang(this._lang());
    this.loadLanguage(this._lang()).subscribe();
  }

  setLanguage(lang: Language): Observable<void> {
    if (!this.SUPPORTED.includes(lang)) return of(void 0);
    localStorage.setItem(this.STORAGE_KEY, lang);
    this._lang.set(lang);
    this.applyHtmlLang(lang);
    return this.loadLanguage(lang).pipe(map(() => void 0));
  }

  private applyHtmlLang(lang: Language): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  t(key: string): string {
    const keys = key.split('.');
    let value: unknown = this._translations();
    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  }

  private initialLang(): Language {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Language | null;
    if (stored && this.SUPPORTED.includes(stored)) return stored;
    const browser = navigator.language.split('-')[0] as Language;
    return this.SUPPORTED.includes(browser) ? browser : 'ca';
  }

  private loadLanguage(lang: Language): Observable<Record<string, unknown>> {
    const cached = this.cache.get(lang);
    if (cached) {
      this._translations.set(cached);
      return of(cached);
    }
    const existing = this.inflight.get(lang);
    if (existing) return existing;

    this._loading.set(true);
    const req$ = this.http
      .get<Record<string, unknown>>(`/assets/i18n/${lang}.json`, {
        headers: new HttpHeaders({ 'X-Silent': 'true' }),
      })
      .pipe(
        tap((data) => {
          this.cache.set(lang, data);
          if (this._lang() === lang) this._translations.set(data);
        }),
        tap({
          next: () => {
            this.inflight.delete(lang);
            this._loading.set(false);
          },
          error: () => {
            this.inflight.delete(lang);
            this._loading.set(false);
          },
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.inflight.set(lang, req$);
    return req$;
  }
}
