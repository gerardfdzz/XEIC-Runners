import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
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
export class RutesComponent implements OnInit, AfterViewInit {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly routesService = inject(StravaRoutesService);

  @ViewChild('filtersAnchor')
  private filtersAnchorRef!: ElementRef<HTMLElement>;
  private filtersSectionTop = 0;

  protected searchQuery = '';
  protected readonly filtersOpen = signal(false);
  protected readonly loading = signal(true);

  private readonly activeFilter = signal<RouteType | 'all'>('all');
  private readonly distanceFilter = signal<string>('all');
  private readonly elevationFilter = signal<string>('all');
  private readonly allRoutes = signal<XeicRoute[]>([]);

  protected readonly filteredRoutes = computed(() => {
    const typeFilter = this.activeFilter();
    const distKey = this.distanceFilter();
    const elevKey = this.elevationFilter();
    const query = this.searchQuery.trim().toLowerCase();
    let routes = this.allRoutes();

    if (query) routes = routes.filter((r) => r.name.toLowerCase().includes(query));
    if (typeFilter !== 'all') routes = routes.filter((r) => r.type === typeFilter);

    if (distKey !== 'all') {
      const range = this.distanceRanges.find((r) => r.key === distKey)!;
      routes = routes.filter((r) => r.distance >= range.min && r.distance < range.max);
    }
    if (elevKey !== 'all') {
      const range = this.elevationRanges.find((r) => r.key === elevKey)!;
      routes = routes.filter((r) => r.elevationGain >= range.min && r.elevationGain < range.max);
    }

    return routes;
  });

  protected readonly resultCount = computed(() => this.filteredRoutes().length);
  protected readonly hasNoResults = computed(
    () => !this.loading() && this.filteredRoutes().length === 0,
  );
  protected readonly activeRangeCount = computed(
    () =>
      (this.activeFilter() !== 'all' ? 1 : 0) +
      (this.distanceFilter() !== 'all' ? 1 : 0) +
      (this.elevationFilter() !== 'all' ? 1 : 0),
  );
  protected readonly hasActiveFilters = computed(() => this.activeRangeCount() > 0);
  protected readonly toggleActive = computed(
    () => this.filtersOpen() || this.activeRangeCount() > 0,
  );

  protected readonly filters: { key: RouteType | 'all'; translationKey: string }[] = [
    { key: 'mountain', translationKey: 'mountain' },
    { key: 'road', translationKey: 'road' },
    { key: 'mixed', translationKey: 'mixed' },
  ];

  protected readonly distanceRanges: { key: string; label: string; min: number; max: number }[] = [
    { key: '<10', label: '<10 km', min: 0, max: 10 },
    { key: '10-20', label: '10–20 km', min: 10, max: 20 },
    { key: '>20', label: '>20 km', min: 20, max: Infinity },
  ];

  protected readonly elevationRanges: { key: string; label: string; min: number; max: number }[] = [
    { key: '<200', label: '<200 m+', min: 0, max: 200 },
    { key: '200-500', label: '200–500 m+', min: 200, max: 500 },
    { key: '>500', label: '>500 m+', min: 500, max: Infinity },
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'Rutes de Running i Trail · XEIC RUNNERS',
      description:
        "Descobreix les millors rutes de running i trail running per La Sénia, el Parc Natural dels Ports i les Terres de l'Ebre. Tracks GPS descarregables des de Strava.",
      keywords:
        "rutes running La Sénia, trail Parc Natural dels Ports, rutes trail Terres de l'Ebre, GPX running, rutes muntanya Tarragona, trail running Ports",
      ogImage: 'https://www.xeicrunners.com/assets/images/galeria/foto-rutes.jpg',
    });

    this.routesService.getRoutes().subscribe((routes) => {
      this.allRoutes.set(routes);
      this.loading.set(false);
    });
  }

  ngAfterViewInit(): void {
    const el = this.filtersAnchorRef?.nativeElement;
    if (el) {
      this.filtersSectionTop = el.getBoundingClientRect().top + window.scrollY;
    }
  }

  protected toggleFilters(): void {
    this.filtersOpen.set(!this.filtersOpen());
  }

  protected setFilter(filter: RouteType | 'all'): void {
    this.activeFilter.set(this.activeFilter() === filter ? 'all' : filter);
    this.scrollToFilters();
  }

  protected setDistanceFilter(key: string): void {
    this.distanceFilter.set(this.distanceFilter() === key ? 'all' : key);
    this.scrollToFilters();
  }

  protected setElevationFilter(key: string): void {
    this.elevationFilter.set(this.elevationFilter() === key ? 'all' : key);
    this.scrollToFilters();
  }

  protected filterClass(key: RouteType | 'all'): string {
    return this.activeFilter() === key
      ? 'rutes-chip rutes-chip--active'
      : 'rutes-chip rutes-chip--default';
  }

  protected distanceChipClass(key: string): string {
    return this.rangeFilterClass(this.distanceFilter(), key);
  }

  protected elevationChipClass(key: string): string {
    return this.rangeFilterClass(this.elevationFilter(), key);
  }

  protected filterLabel(translationKey: string): string {
    return this.i18n.t('routes.filters.' + translationKey);
  }

  private rangeFilterClass(activeKey: string, key: string): string {
    return activeKey === key ? 'rutes-chip rutes-chip--active' : 'rutes-chip rutes-chip--default';
  }

  private scrollToFilters(): void {
    window.scrollTo({
      top: Math.max(0, this.filtersSectionTop - 64),
      behavior: 'smooth',
    });
  }
}
