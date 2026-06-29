import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { StravaRoutesService } from '../../core/services/strava-routes.service';
import { StravaService } from '../../core/services/strava.service';
import { EventsSheetService } from '../../core/services/events-sheet.service';
import { EventMergeService } from '../../core/services/event-merge.service';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { LightboxComponent } from '../../shared/components/lightbox/lightbox.component';
import { WHATSAPP_INVITE_URL } from '../../core/config';
import { XeicEvent } from '../../core/models/event.model';
import { XeicRoute } from '../../core/models/route.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, EventCardComponent, LightboxComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  protected i18n = inject(I18nService);
  private seo = inject(SeoService);
  private routesService = inject(StravaRoutesService);
  private strava = inject(StravaService);
  private sheet = inject(EventsSheetService);
  private eventMerge = inject(EventMergeService);

  protected readonly whatsappUrl = WHATSAPP_INVITE_URL;

  upcomingEvents = signal<XeicEvent[]>([]);
  eventsLoading = signal(true);
  featuredRoutes = signal<XeicRoute[]>([]);
  routeCount = signal<string>('—');
  memberCount = signal<string>('—');
  selectedEvent = signal<XeicEvent | null>(null);

  openLightbox(event: XeicEvent): void {
    this.selectedEvent.set(event);
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.selectedEvent.set(null);
    document.body.style.overflow = '';
  }

  scrollToOrigen(): void {
    document.getElementById('origen')?.scrollIntoView({ behavior: 'smooth' });
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'XEIC RUNNERS · Club de Running i Trail a La Sénia',
      description:
        "XEIC RUNNERS, el club de running i trail de La Sénia. Correr a La Sénia mai havia estat tan social: més de 130 membres, sortides setmanals pels Ports i les Terres de l'Ebre. Uneix-te!",
      keywords:
        "La Sénia Running, La Sénia Correr, correr La Sénia, running La Sénia, club running La Sénia, runners La Sénia, XEIC RUNNERS, club running Terres de l'Ebre, running social La Sénia, club esportiu La Sénia, running Montsià",
    });

    this.routesService.getRoutes().subscribe((routes) => {
      this.featuredRoutes.set(routes.slice(0, 4));
      this.routeCount.set(routes.length > 0 ? `${routes.length}` : '∞');
    });

    this.strava.getData().subscribe((data) => {
      if (data?.club?.member_count) {
        this.memberCount.set(`${data.club.member_count}`);
      }
    });

    forkJoin({
      groupEvents: this.strava.getGroupEvents(),
      sheetEvents: this.sheet.getEvents(),
    }).subscribe(({ groupEvents, sheetEvents }) => {
      const upcoming = this.eventMerge.mergeUpcomingEvents(groupEvents, sheetEvents);
      this.upcomingEvents.set(upcoming.slice(0, 3));
      this.eventsLoading.set(false);
    });
  }
}
