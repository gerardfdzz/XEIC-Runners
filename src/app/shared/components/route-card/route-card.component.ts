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
    const labels: Record<string, string> = {
      mountain: 'Muntanya',
      road: 'Asfalt',
      mixed: 'Mixte',
    };
    return labels[this.route.type] ?? this.route.type;
  }

  difficultyLabel(): string {
    const labels: Record<string, string> = {
      easy: 'Fàcil',
      medium: 'Mig',
      xeic: 'Xeic!',
    };
    return labels[this.route.difficulty] ?? this.route.difficulty;
  }

  typeChipClass(): string {
    return `chip chip--${this.route.type}`;
  }

  difficultyChipClass(): string {
    return `chip chip--${this.route.difficulty}`;
  }
}
