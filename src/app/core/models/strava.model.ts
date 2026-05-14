export interface StravaClub {
  id: number;
  name: string;
  sport_type: string;
  city: string;
  state: string;
  country: string;
  member_count: number;
  athlete_count: number;
  description: string;
  profile_medium: string;
  profile: string;
  activity_types: string[];
}

export interface StravaAthlete {
  firstname: string;
  lastname: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  athlete: StravaAthlete;
}

export interface StravaGroupEvent {
  id: number;
  title: string;
  description: string;
  club_id: number;
  activity_type: string;
  created_at: string;
  start_date: string;
  upcoming_occurrences: string[];
  address: string;
  route_id: number | null;
  organizing_athlete: StravaAthlete;
}

export interface StravaData {
  club: StravaClub;
  activities: StravaActivity[];
  groupEvents: StravaGroupEvent[];
}
