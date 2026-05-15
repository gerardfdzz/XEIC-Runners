import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XeicRoute } from '../../../core/models/route.model';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-route-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-card.component.html',
  styleUrl: './route-card.component.scss',
})
export class RouteCardComponent {
  @Input({ required: true }) route!: XeicRoute;
  protected i18n = inject(I18nService);

  typeLabel(): string {
    const key = `routes.filters.${this.route.type}`;
    const t = this.i18n.t(key);
    return t.startsWith('routes.') ? this.route.type : t;
  }

  typeChipClass(): string {
    return `chip chip--${this.route.type}`;
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }
}
