import { Injectable } from '@angular/core';
import { XeicEvent } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventsDataService {
  private readonly events: XeicEvent[] = [
    {
      id: 'quedada-dimarts-1',
      title: 'Quedada de Dimarts',
      date: new Date('2025-06-17'),
      time: '19:30',
      location: 'Poliesportiu La Sénia',
      distance: '8km',
      type: 'training',
      difficulty: 'Iniciació',
      tags: ['Iniciació', 'Asfalt'],
      imageUrl:
        'https://apropebre.cat/wp-content/uploads/2026/04/DSC09088-1024x683.jpg',
      description:
        'Quedada setmanal de dimarts. Ritme suau, apta per a tothom.',
    },
    {
      id: 'sortida-estrets',
      title: 'Sortida als Estrets',
      date: new Date('2025-06-21'),
      time: '08:00',
      location: 'Plaça Catalunya',
      distance: '15km',
      elevationGain: '800m d+',
      type: 'race',
      difficulty: 'Xeic!',
      tags: ['Xeic!', 'Muntanya'],
      imageUrl:
        'https://apropebre.cat/wp-content/uploads/2026/04/DSC09145-1024x683.jpg',
      description: 'Sortida als espectaculars Estrets del riu Sénia.',
    },
    {
      id: 'entrenament-pista',
      title: 'Entrenament Pista',
      date: new Date('2025-06-24'),
      time: '19:30',
      location: "Pistes d'Atletisme",
      type: 'track',
      difficulty: 'Mitjà',
      tags: ['Mitjà', 'Social'],
      imageUrl:
        'https://apropebre.cat/wp-content/uploads/2026/04/DSC09094-1024x683.jpg',
      description: "Sèries en grup a les pistes d'atletisme.",
    },
    {
      id: 'volta-olivers',
      title: 'Volta dels Olivers Mil·lenaris',
      date: new Date('2025-07-05'),
      time: '08:30',
      location: 'Plaça Major La Sénia',
      distance: '8.5km',
      elevationGain: '60m d+',
      type: 'social',
      difficulty: 'Iniciació',
      tags: ['Iniciació', 'Asfalt'],
      imageUrl:
        'https://apropebre.cat/wp-content/uploads/2026/04/DSC09104-1024x683.jpg',
      description: 'Recorregut familiar pels olivers mil·lenaris de la Sénia.',
    },
    {
      id: 'cim-pica-martell',
      title: 'Repte Pica del Martell',
      date: new Date('2025-07-12'),
      time: '06:30',
      location: 'Font del Pi',
      distance: '14.2km',
      elevationGain: '850m d+',
      type: 'race',
      difficulty: 'Xeic!',
      tags: ['Xeic!', 'Muntanya'],
      imageUrl:
        'https://apropebre.cat/wp-content/uploads/2026/04/DSC09152-1024x683.jpg',
      description: 'Ascensió al cim més emblemàtic dels Ports de Beseit.',
    },
    {
      id: 'sopar-runner',
      title: "Sopar de l'Estiu Xeic",
      date: new Date('2025-07-19'),
      time: '21:00',
      location: 'Casal de la Sénia',
      type: 'social',
      difficulty: 'Iniciació',
      tags: ['Social', 'Comunitat'],
      imageUrl:
        'https://apropebre.cat/wp-content/uploads/2026/04/DSC09169-1024x683.jpg',
      description:
        'Sopar de germanor per celebrar la temporada. Tothom és benvingut!',
    },
  ];

  private readonly LS_KEY = 'xeic-custom-events';

  getAll(): XeicEvent[] {
    return [...this.events, ...this.getCustom()];
  }

  getUpcoming(count?: number): XeicEvent[] {
    const now = new Date();
    const upcoming = this.getAll()
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return count ? upcoming.slice(0, count) : upcoming;
  }

  getById(id: string): XeicEvent | undefined {
    return this.getAll().find((e) => e.id === id);
  }

  getCustom(): XeicEvent[] {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (!raw) return [];
      const parsed: (Omit<XeicEvent, 'date'> & { date: string })[] =
        JSON.parse(raw);
      return parsed.map((e) => ({ ...e, date: new Date(e.date) }));
    } catch {
      return [];
    }
  }

  addCustom(event: Omit<XeicEvent, 'id' | 'isCustom'>): XeicEvent {
    const newEvent: XeicEvent = {
      ...event,
      id: `custom-${Date.now()}`,
      isCustom: true,
    };
    const existing = this.getCustom();
    localStorage.setItem(this.LS_KEY, JSON.stringify([...existing, newEvent]));
    return newEvent;
  }

  deleteCustom(id: string): void {
    const filtered = this.getCustom().filter((e) => e.id !== id);
    localStorage.setItem(this.LS_KEY, JSON.stringify(filtered));
  }
}
