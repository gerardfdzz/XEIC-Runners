import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { EventsDataService } from '../../core/services/events-data.service';
import { RoutesDataService } from '../../core/services/routes-data.service';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { XeicEvent } from '../../core/models/event.model';
import { XeicRoute } from '../../core/models/route.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, EventCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  protected i18n = inject(I18nService);
  private eventsService = inject(EventsDataService);
  private routesService = inject(RoutesDataService);

  upcomingEvents = signal<XeicEvent[]>([]);
  featuredRoutes = signal<XeicRoute[]>([]);

  ngOnInit(): void {
    this.upcomingEvents.set(this.eventsService.getUpcoming(3));
    this.featuredRoutes.set(this.routesService.getFeatured().slice(0, 2));
  }
}
