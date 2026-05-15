import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { StravaRoutesService } from '../../core/services/strava-routes.service';
import { RouteCardComponent } from '../../shared/components/route-card/route-card.component';
import { XeicRoute, RouteType } from '../../core/models/route.model';

@Component({
  selector: 'app-rutes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouteCardComponent],
  templateUrl: './rutes.component.html',
  styleUrl: './rutes.component.scss',
})
export class RutesComponent implements OnInit {
  protected i18n = inject(I18nService);
  private routesService = inject(StravaRoutesService);

  searchQuery = '';
  activeFilter = signal<RouteType | 'all'>('all');
  loading = signal(true);
  private allRoutes = signal<XeicRoute[]>([]);

  filters: { key: RouteType | 'all'; translationKey: string }[] = [
    { key: 'all', translationKey: 'all' },
    { key: 'mountain', translationKey: 'mountain' },
    { key: 'road', translationKey: 'road' },
    { key: 'mixed', translationKey: 'mixed' },
  ];

  filteredRoutes = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery.trim().toLowerCase();
    let routes = this.allRoutes();

    if (query) {
      routes = routes.filter((r) => r.name.toLowerCase().includes(query));
    }
    if (filter !== 'all') {
      routes = routes.filter((r) => r.type === filter);
    }
    return routes;
  });

  ngOnInit(): void {
    this.routesService.getRoutes().subscribe((routes) => {
      this.allRoutes.set(routes);
      this.loading.set(false);
    });
  }

  setFilter(filter: RouteType | 'all'): void {
    this.activeFilter.set(filter);
    this.searchQuery = '';
  }

  filterClass(key: RouteType | 'all'): string {
    return this.activeFilter() === key
      ? 'rutes-chip rutes-chip--active'
      : 'rutes-chip rutes-chip--default';
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }
}
