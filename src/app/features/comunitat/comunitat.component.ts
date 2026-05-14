import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { I18nService } from '../../core/services/i18n.service';
import { StravaService } from '../../core/services/strava.service';
import { StravaActivity } from '../../core/models/strava.model';

interface Stat {
  icon: string;
  value: string;
  label: string;
}

const FALLBACK_STATS: Stat[] = [
  { icon: 'person', value: '130+', label: 'Membres' },
  { icon: 'route', value: '∞', label: 'Rutes' },
  { icon: 'event', value: '40+', label: 'Sortides/any' },
  { icon: 'landscape', value: '500+', label: 'km compartits' },
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

  stats: Stat[] = FALLBACK_STATS;
  activities: StravaActivity[] = [];
  loading = true;

  ngOnInit(): void {
    this.strava.getData().subscribe((data) => {
      this.loading = false;

      if (!data) return;

      const totalKm = data.activities.reduce(
        (acc, a) => acc + a.distance / 1000,
        0,
      );

      this.stats = [
        {
          icon: 'person',
          value: `${data.club.member_count}`,
          label: 'Membres',
        },
        { icon: 'route', value: '∞', label: 'Rutes' },
        { icon: 'event', value: '40+', label: 'Sortides/any' },
        {
          icon: 'landscape',
          value: `${Math.round(totalKm)}km`,
          label: 'Recents (Strava)',
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
