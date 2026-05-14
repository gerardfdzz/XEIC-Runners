import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

export type Language = 'ca' | 'es' | 'en';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly STORAGE_KEY = 'xeic-lang';
  private readonly SUPPORTED: Language[] = ['ca', 'es', 'en'];

  private _lang = signal<Language>(this.initialLang());
  private _translations = signal<Record<string, unknown>>({});
  private cache = new Map<Language, Record<string, unknown>>();

  currentLang = this._lang.asReadonly();
  translations = this._translations.asReadonly();

  langLabel = computed(() => {
    const labels: Record<Language, string> = { ca: 'CA', es: 'ES', en: 'EN' };
    return labels[this._lang()];
  });

  constructor(private http: HttpClient) {
    this.loadLanguage(this._lang());
  }

  setLanguage(lang: Language): void {
    if (!this.SUPPORTED.includes(lang)) return;
    localStorage.setItem(this.STORAGE_KEY, lang);
    this._lang.set(lang);
    this.loadLanguage(lang);
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

  private loadLanguage(lang: Language): void {
    if (this.cache.has(lang)) {
      this._translations.set(this.cache.get(lang)!);
      return;
    }
    this.http
      .get<Record<string, unknown>>(`/assets/i18n/${lang}.json`)
      .pipe(
        tap((data) => {
          this.cache.set(lang, data);
          this._translations.set(data);
        })
      )
      .subscribe();
  }
}
