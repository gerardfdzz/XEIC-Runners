export type RouteType = 'mountain' | 'road' | 'mixed';
export type RouteDifficulty = 'easy' | 'medium' | 'xeic';

export interface XeicRoute {
  id: string;
  name: string;
  description: string;
  distance: number;
  elevationGain: number;
  estimatedTime: string;
  type: RouteType;
  difficulty: RouteDifficulty;
  imageUrl: string;
  stravaUrl?: string;
  gpxUrl?: string;
  location: string;
  isFeatured?: boolean;
}
