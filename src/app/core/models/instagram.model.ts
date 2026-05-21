export interface InstagramItem {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  takenAt: number;
}

export interface InstagramHighlightsResponse {
  items: InstagramItem[];
}
