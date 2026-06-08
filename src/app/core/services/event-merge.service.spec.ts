import { TestBed } from '@angular/core/testing';
import { EventMergeService } from './event-merge.service';
import { XeicEvent } from '../models/event.model';
import { StravaGroupEvent } from '../models/strava.model';
import { CLUB_IMAGE_URL } from '../config';

describe('EventMergeService', () => {
  let service: EventMergeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventMergeService);
  });

  describe('isStrictlyBeforeToday', () => {
    it('returns true for yesterday', () => {
      const now = new Date(2026, 4, 26, 10, 0, 0);
      const yesterday = new Date(2026, 4, 25, 23, 0, 0);
      expect(service.isStrictlyBeforeToday(yesterday, now)).toBe(true);
    });

    it('returns false for today even if hours are earlier than now', () => {
      const now = new Date(2026, 4, 26, 23, 0, 0);
      const earlierToday = new Date(2026, 4, 26, 7, 0, 0);
      expect(service.isStrictlyBeforeToday(earlierToday, now)).toBe(false);
    });

    it('returns false for tomorrow', () => {
      const now = new Date(2026, 4, 26, 10, 0, 0);
      const tomorrow = new Date(2026, 4, 27, 9, 0, 0);
      expect(service.isStrictlyBeforeToday(tomorrow, now)).toBe(false);
    });
  });

  describe('mapActivityType', () => {
    it('maps known Strava activity_types to EventType', () => {
      expect(service.mapActivityType('Run')).toBe('training');
      expect(service.mapActivityType('TrailRun')).toBe('race');
      expect(service.mapActivityType('Walk')).toBe('social');
      expect(service.mapActivityType('Hike')).toBe('social');
      expect(service.mapActivityType('Ride')).toBe('training');
    });

    it('falls back to "social" for unknown activity types', () => {
      expect(service.mapActivityType('Swim')).toBe('social');
      expect(service.mapActivityType('')).toBe('social');
    });
  });

  describe('mapActivityTag', () => {
    it('title keywords take precedence over activity_type', () => {
      expect(service.mapActivityTag('Run', 'Trail nocturn')).toBe('Trail');
      expect(service.mapActivityTag('Run', 'Senderisme als Ports')).toBe('Senderisme');
      expect(service.mapActivityTag('Run', 'Caminada amb gossos')).toBe('Caminada');
    });

    it('falls back to activity_type mapping when title has no keyword', () => {
      expect(service.mapActivityTag('Run', 'Quedada matinal')).toBe('Entrenament');
      expect(service.mapActivityTag('Walk', 'Quedada')).toBe('Caminada');
      expect(service.mapActivityTag('Hike', 'Quedada')).toBe('Senderisme');
    });

    it('returns Entrenament for unmapped activity types', () => {
      expect(service.mapActivityTag('Yoga', 'Sessió')).toBe('Entrenament');
    });

    it('returns Entrenament when nothing matches', () => {
      expect(service.mapActivityTag('', '')).toBe('Entrenament');
    });
  });

  describe('stravaToXeicEvent', () => {
    const baseStrava: StravaGroupEvent = {
      id: 42,
      title: 'Quedada nocturna',
      description: 'desc strava',
      club_id: 1,
      activity_type: 'Run',
      created_at: '',
      start_date: '',
      upcoming_occurrences: ['2026-06-01T19:30:00Z'],
      address: 'Plaça Major',
      route_id: null,
      organizing_athlete: { firstname: 'Teo', lastname: 'A.' },
    };

    it('uses CLUB_IMAGE_URL when no matching sheet event is found', () => {
      const result = service.stravaToXeicEvent(baseStrava, []);
      expect(result.imageUrl).toBe(CLUB_IMAGE_URL);
      expect(result.id).toBe('strava-42');
      expect(result.location).toBe('Plaça Major');
    });

    it('prefers sheet description, tags and imageUrl when the title matches', () => {
      const sheet: XeicEvent[] = [
        {
          id: 'sheet-1',
          title: 'quedada nocturna',
          date: new Date(2026, 5, 1),
          time: '19:30',
          location: 'override',
          type: 'training',
          difficulty: 'Iniciació',
          tags: ['Trail', 'Nit'],
          imageUrl: 'assets/images/x.jpg',
          description: 'desc sheet',
        },
      ];
      const result = service.stravaToXeicEvent(baseStrava, sheet);
      expect(result.imageUrl).toBe('assets/images/x.jpg');
      expect(result.tags).toEqual(['Trail', 'Nit']);
      expect(result.description).toBe('desc sheet');
    });

    it('falls back to "La Sénia" when no address is provided', () => {
      const result = service.stravaToXeicEvent({ ...baseStrava, address: '' }, []);
      expect(result.location).toBe('La Sénia');
    });
  });

  describe('mergeUpcomingEvents', () => {
    const today = new Date(2026, 4, 26);
    const tomorrow = new Date(2026, 4, 27);
    const yesterday = new Date(2026, 4, 25);

    it('returns Strava-derived events when present, sorted ascending', () => {
      const later: StravaGroupEvent = {
        id: 2,
        title: 'B',
        description: '',
        club_id: 1,
        activity_type: 'Run',
        created_at: '',
        start_date: '',
        upcoming_occurrences: [new Date(2026, 4, 28).toISOString()],
        address: '',
        route_id: null,
        organizing_athlete: { firstname: '', lastname: '' },
      };
      const sooner: StravaGroupEvent = {
        ...later,
        id: 1,
        title: 'A',
        upcoming_occurrences: [tomorrow.toISOString()],
      };
      jasmine.clock().install();
      jasmine.clock().mockDate(today);
      try {
        const out = service.mergeUpcomingEvents([later, sooner], []);
        expect(out.map((e) => e.title)).toEqual(['A', 'B']);
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('falls back to sheet events when no group events are upcoming', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(today);
      try {
        const sheet: XeicEvent[] = [
          {
            id: 'sheet-1',
            title: 'past',
            date: yesterday,
            time: '10:00',
            location: '',
            type: 'social',
            difficulty: 'Iniciació',
            tags: [],
            imageUrl: '',
          },
          {
            id: 'sheet-2',
            title: 'future',
            date: tomorrow,
            time: '10:00',
            location: '',
            type: 'social',
            difficulty: 'Iniciació',
            tags: [],
            imageUrl: '',
          },
        ];
        const out = service.mergeUpcomingEvents([], sheet);
        expect(out.map((e) => e.title)).toEqual(['future']);
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });
});
