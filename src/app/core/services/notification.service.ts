import { Injectable, signal, computed } from '@angular/core';

export type NotificationKind = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
  ttl: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _items = signal<Notification[]>([]);
  private nextId = 1;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  info(message: string, ttl = 4000): number {
    return this.push('info', message, ttl);
  }
  success(message: string, ttl = 4000): number {
    return this.push('success', message, ttl);
  }
  warning(message: string, ttl = 6000): number {
    return this.push('warning', message, ttl);
  }
  error(message: string, ttl = 8000): number {
    return this.push('error', message, ttl);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._items.update((list) => list.filter((n) => n.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this._items.set([]);
  }

  private push(kind: NotificationKind, message: string, ttl: number): number {
    const id = this.nextId++;
    this._items.update((list) => [...list, { id, kind, message, ttl }]);
    if (ttl > 0) {
      const timer = setTimeout(() => this.dismiss(id), ttl);
      this.timers.set(id, timer);
    }
    return id;
  }
}
