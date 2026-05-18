import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { I18nService } from '../../core/services/i18n.service';
import { StravaService } from '../../core/services/strava.service';
import { StravaRoutesService } from '../../core/services/strava-routes.service';
import { StravaActivity } from '../../core/models/strava.model';

interface Stat {
  icon: string;
  value: string;
  labelKey: string;
}

const FALLBACK_STATS: Stat[] = [
  { icon: 'person', value: '130+', labelKey: 'community.stats.members' },
  { icon: 'route', value: '∞', labelKey: 'community.stats.routes' },
  { icon: 'event', value: '40+', labelKey: 'community.stats.outingsPerYear' },
  { icon: 'landscape', value: '500+', labelKey: 'community.stats.kmShared' },
];

@Component({
  selector: 'app-comunitat',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './comunitat.component.html',
  styleUrl: './comunitat.component.scss',
})
export class ComunitatComponent implements OnInit {
  protected i18n = inject(I18nService);
  protected strava = inject(StravaService);
  private routesService = inject(StravaRoutesService);

  stats: Stat[] = FALLBACK_STATS;
  activities: StravaActivity[] = [];
  loading = true;
  memberCount = '...';

  ngOnInit(): void {
    forkJoin({
      strava: this.strava.getData(),
      routes: this.routesService.getRoutes(),
    }).subscribe(({ strava: data, routes }) => {
      this.loading = false;

      const routeCount = routes.length > 0 ? `${routes.length}` : '∞';

      if (!data) {
        this.stats = FALLBACK_STATS.map((s) =>
          s.labelKey === 'community.stats.routes'
            ? { ...s, value: routeCount }
            : s,
        );
        return;
      }

      this.memberCount = `${data.club.member_count}`;

      const totalKm = data.activities.reduce(
        (acc, a) => acc + a.distance / 1000,
        0,
      );

      this.stats = [
        {
          icon: 'person',
          value: `${data.club.member_count}`,
          labelKey: 'community.stats.members',
        },
        {
          icon: 'route',
          value: routeCount,
          labelKey: 'community.stats.routes',
        },
        {
          icon: 'event',
          value: '40+',
          labelKey: 'community.stats.outingsPerYear',
        },
        {
          icon: 'landscape',
          value: `${Math.round(totalKm)}km`,
          labelKey: 'community.stats.recentStrava',
        },
      ];

      this.activities = data.activities.slice(0, 8);
    });
  }

  formatDistance(m: number): string {
    return StravaService.formatDistance(m);
  }
  formatTime(s: number): string {
    return StravaService.formatTime(s);
  }

  activityIcon(type: string): string {
    const icons: Record<string, string> = {
      Run: 'directions_run',
      TrailRun: 'trail_length',
      Walk: 'directions_walk',
      Hike: 'hiking',
      Ride: 'directions_bike',
    };
    return icons[type] ?? 'directions_run';
  }
}
