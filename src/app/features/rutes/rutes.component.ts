import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { RoutesDataService } from '../../core/services/routes-data.service';
import { RouteCardComponent } from '../../shared/components/route-card/route-card.component';
import { XeicRoute } from '../../core/models/route.model';

type FilterType =
  | 'all'
  | 'mountain'
  | 'road'
  | 'mixed'
  | 'easy'
  | 'medium'
  | 'xeic';

@Component({
  selector: 'app-rutes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouteCardComponent],
  templateUrl: './rutes.component.html',
  styleUrl: './rutes.component.scss',
})
export class RutesComponent implements OnInit {
  protected i18n = inject(I18nService);
  private routesService = inject(RoutesDataService);

  searchQuery = '';
  activeFilter = signal<FilterType>('all');
  private allRoutes = signal<XeicRoute[]>([]);
  private searchResults = signal<XeicRoute[]>([]);
  protected useSearch = signal(false);

  filters: { key: FilterType; translationKey: string }[] = [
    { key: 'all', translationKey: 'all' },
    { key: 'mountain', translationKey: 'mountain' },
    { key: 'road', translationKey: 'road' },
    { key: 'mixed', translationKey: 'mixed' },
    { key: 'easy', translationKey: 'easy' },
    { key: 'medium', translationKey: 'medium' },
    { key: 'xeic', translationKey: 'xeic' },
  ];

  filteredRoutes = computed(() => {
    if (this.useSearch()) return this.searchResults();
    const filter = this.activeFilter();
    const routes = this.allRoutes();
    if (filter === 'all') return routes;
    if (filter === 'easy' || filter === 'medium' || filter === 'xeic') {
      return routes.filter((r) => r.difficulty === filter);
    }
    return routes.filter((r) => r.type === filter);
  });

  ngOnInit(): void {
    this.allRoutes.set(this.routesService.getAll());
  }

  setFilter(filter: FilterType): void {
    this.activeFilter.set(filter);
    this.useSearch.set(false);
    this.searchQuery = '';
  }

  onSearch(query: string): void {
    if (!query.trim()) {
      this.useSearch.set(false);
      return;
    }
    this.useSearch.set(true);
    this.searchResults.set(this.routesService.search(query));
  }

  filterClass(key: FilterType): string {
    if (this.activeFilter() === key && !this.useSearch()) {
      return 'rutes-chip rutes-chip--active';
    }
    return 'rutes-chip rutes-chip--default';
  }
}
