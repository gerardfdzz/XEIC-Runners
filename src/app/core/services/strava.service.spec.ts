import { StravaService } from './strava.service';

describe('StravaService (static formatters)', () => {
  describe('formatDistance', () => {
    it('converts metres to km with one decimal', () => {
      expect(StravaService.formatDistance(0)).toBe('0.0');
      expect(StravaService.formatDistance(1000)).toBe('1.0');
      expect(StravaService.formatDistance(12345)).toBe('12.3');
    });
  });

  describe('formatTime', () => {
    it('returns "Nmin" when shorter than one hour', () => {
      expect(StravaService.formatTime(0)).toBe('0min');
      expect(StravaService.formatTime(59 * 60)).toBe('59min');
    });

    it('returns "Xh Ymin" when one hour or more', () => {
      expect(StravaService.formatTime(60 * 60)).toBe('1h 0min');
      expect(StravaService.formatTime(3 * 3600 + 25 * 60)).toBe('3h 25min');
    });
  });
});
