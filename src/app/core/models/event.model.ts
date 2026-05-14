export type EventType = 'training' | 'race' | 'social' | 'track';
export type EventDifficulty = 'Iniciació' | 'Mitjà' | 'Xeic!';

export interface XeicEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  location: string;
  distance?: string;
  elevationGain?: string;
  type: EventType;
  difficulty: EventDifficulty;
  tags: string[];
  imageUrl: string;
  description?: string;
  registrationUrl?: string;
  isCustom?: boolean;
}
