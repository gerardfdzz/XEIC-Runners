export interface InstagramItem {
  id: string;
  imageUrl: string;
  takenAt: number;
}

export interface InstagramHighlightsResponse {
  items: InstagramItem[];
}
