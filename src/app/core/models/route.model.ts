export type RouteType = 'mountain' | 'road' | 'mixed';

export interface XeicRoute {
  id: string;
  name: string;
  description: string | null;
  distance: number;
  elevationGain: number;
  estimatedTime: number;
  type: RouteType;
  mapImageUrl: string | null;
  stravaUrl: string;
}
