import { Injectable } from '@angular/core';
import { XeicRoute } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RoutesDataService {
  private readonly routes: XeicRoute[] = [
    {
      id: 'pica-martell',
      name: 'Pica del Martell via Racó d\'en Marc',
      description: 'Ascensió tècnica amb vistes espectaculars a tota la comarca. Terreny pedregós i exigent que recompensa amb panoràmiques úniques dels Ports de Beseit.',
      distance: 14.2,
      elevationGain: 850,
      estimatedTime: '2:15',
      type: 'mountain',
      difficulty: 'xeic',
      imageUrl: 'https://apropebre.cat/wp-content/uploads/2026/04/DSC09145-1024x683.jpg',
      stravaUrl: 'https://www.strava.com/clubs/1576309',
      location: 'La Sénia - Els Ports',
      isFeatured: true,
    },
    {
      id: 'olivers-millenaris',
      name: 'Ruta dels Olivers Mil·lenaris',
      description: 'Recorregut planer ideal per a iniciació o tirades suaus entre patrimoni viu. Passa vora els olivers mil·lenaris del terme de la Sénia.',
      distance: 8.5,
      elevationGain: 60,
      estimatedTime: '0:50',
      type: 'road',
      difficulty: 'easy',
      imageUrl: 'https://apropebre.cat/wp-content/uploads/2026/04/DSC09088-1024x683.jpg',
      stravaUrl: 'https://www.strava.com/clubs/1576309',
      location: 'La Sénia',
    },
    {
      id: 'panta-ulldecona',
      name: 'Volta al Pantà d\'Ulldecona',
      description: 'Circular clàssica combinant pista forestal i senders vora l\'aigua. Molt agraïda a la primavera quan la vegetació floreix.',
      distance: 12.0,
      elevationGain: 220,
      estimatedTime: '1:20',
      type: 'mixed',
      difficulty: 'medium',
      imageUrl: 'https://apropebre.cat/wp-content/uploads/2026/04/DSC09094-1024x683.jpg',
      stravaUrl: 'https://www.strava.com/clubs/1576309',
      location: 'Ulldecona - La Sénia',
    },
    {
      id: 'volta-clots',
      name: 'Volta als Clots',
      description: 'Ruta circular pels voltants de la Sénia que travessa camps d\'oliveres i garrofers amb vistes al Montsià.',
      distance: 12.5,
      elevationGain: 240,
      estimatedTime: '1:30',
      type: 'mixed',
      difficulty: 'medium',
      imageUrl: 'https://apropebre.cat/wp-content/uploads/2026/04/DSC09104-1024x683.jpg',
      stravaUrl: 'https://www.strava.com/clubs/1576309',
      location: 'La Sénia',
    },
    {
      id: 'pallerols',
      name: 'Pujada al Pallerols',
      description: 'Ascensió de referència dels Ports de Beseit. Una ruta dura que posa a prova fins als corredors més experimentats.',
      distance: 18.2,
      elevationGain: 950,
      estimatedTime: '2:45',
      type: 'mountain',
      difficulty: 'xeic',
      imageUrl: 'https://apropebre.cat/wp-content/uploads/2026/04/DSC09152-1024x683.jpg',
      stravaUrl: 'https://www.strava.com/clubs/1576309',
      location: 'La Sénia - Ports de Beseit',
      isFeatured: true,
    },
    {
      id: 'estrets-senia',
      name: 'Sortida als Estrets',
      description: 'Ruta pels impressionants Estrets del riu Sénia, un congost espectacular que sorprèn a tothom qui el visita.',
      distance: 15.0,
      elevationGain: 800,
      estimatedTime: '2:10',
      type: 'mountain',
      difficulty: 'xeic',
      imageUrl: 'https://apropebre.cat/wp-content/uploads/2026/04/DSC09169-1024x683.jpg',
      stravaUrl: 'https://www.strava.com/clubs/1576309',
      location: 'La Sénia - Estrets',
      isFeatured: true,
    },
  ];

  getAll(): XeicRoute[] {
    return this.routes;
  }

  getById(id: string): XeicRoute | undefined {
    return this.routes.find((r) => r.id === id);
  }

  getFeatured(): XeicRoute[] {
    return this.routes.filter((r) => r.isFeatured);
  }

  filterByType(type: string): XeicRoute[] {
    if (type === 'all') return this.routes;
    return this.routes.filter((r) => r.type === type);
  }

  filterByDifficulty(difficulty: string): XeicRoute[] {
    return this.routes.filter((r) => r.difficulty === difficulty);
  }

  search(query: string): XeicRoute[] {
    const q = query.toLowerCase();
    return this.routes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
    );
  }
}
