export interface Member {
  id: string;
  name: string;
  role: string;
  quote: string;
  imageUrl: string;
  isFounder: boolean;
  socialLinks?: {
    instagram?: string;
    strava?: string;
  };
}
