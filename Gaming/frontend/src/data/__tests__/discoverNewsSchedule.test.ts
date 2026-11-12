import { describe, it, expect } from 'vitest';
import {
  getISOWeekInfo,
  getMonthInfo,
  isWithinPastDays,
  getRelativeTime,
  WEEKLY_THEMES_SCHEDULE,
  MONTHLY_THEMES_SCHEDULE,
  getDynamicFallbackNews
} from '../discoverNewsSchedule';

describe('Weekly & Monthly Gaming News Intelligence', () => {
  it('correctly calculates ISO week info with year, week, key, and month', () => {
    const d = new Date(Date.UTC(2026, 10, 13)); // Nov 13, 2026
    const info = getISOWeekInfo(d);
    expect(info.year).toBe(2026);
    expect(info.week).toBe(46);
    expect(info.key).toBe('2026-W46');
    expect(info.month).toBe(11);
    expect(info.monthName).toBe('November');
  });

  it('contains full 52-week thematic schedule with distinct gaming topics', () => {
    expect(WEEKLY_THEMES_SCHEDULE.length).toBe(52);
    WEEKLY_THEMES_SCHEDULE.forEach((themeObj, idx) => {
      expect(themeObj.theme).toBeTruthy();
      expect(Array.isArray(themeObj.topics)).toBe(true);
      expect(themeObj.topics.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('contains full 12-month thematic schedule with month directives', () => {
    expect(MONTHLY_THEMES_SCHEDULE.length).toBe(12);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    MONTHLY_THEMES_SCHEDULE.forEach((m, idx) => {
      expect(m.month).toBe(monthNames[idx]);
      expect(m.theme).toBeTruthy();
      expect(m.focus).toBeTruthy();
      expect(m.topics.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('accurately resolves current month information and directives', () => {
    const d = new Date(Date.UTC(2026, 10, 15)); // November
    const mInfo = getMonthInfo(d);
    expect(mInfo.month).toBe(11);
    expect(mInfo.name).toBe('November');
    expect(mInfo.key).toBe('2026-11');
    expect(mInfo.theme.month).toBe('November');
    expect(mInfo.theme.theme).toContain('Hardware Flagships');
  });

  it('accurately checks whether article dates fall within past days', () => {
    const now = Date.now();
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toUTCString();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toUTCString();
    const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000).toUTCString();

    // 7 days window (This Week)
    expect(isWithinPastDays(twoDaysAgo, 7)).toBe(true);
    expect(isWithinPastDays(tenDaysAgo, 7)).toBe(false);
    expect(isWithinPastDays(fortyDaysAgo, 7)).toBe(false);

    // 30 days window (This Month)
    expect(isWithinPastDays(twoDaysAgo, 30)).toBe(true);
    expect(isWithinPastDays(tenDaysAgo, 30)).toBe(true);
    expect(isWithinPastDays(fortyDaysAgo, 30)).toBe(false);
  });

  it('formats relative time strings accurately', () => {
    const now = Date.now();
    expect(getRelativeTime(new Date(now - 5 * 60 * 1000).toUTCString())).toBe('Just now');
    expect(getRelativeTime(new Date(now - 3 * 3600 * 1000).toUTCString())).toBe('3h ago');
    expect(getRelativeTime(new Date(now - 26 * 3600 * 1000).toUTCString())).toBe('Yesterday');
    expect(getRelativeTime(new Date(now - 3 * 86400 * 1000).toUTCString())).toBe('3d ago');
  });

  it('generates dynamic fallback news with current timestamps', () => {
    const news = getDynamicFallbackNews();
    expect(news.length).toBeGreaterThanOrEqual(6);
    const firstPub = new Date(news[0].pubDate).getTime();
    expect(Date.now() - firstPub).toBeLessThan(1000 * 60 * 60 * 2); // Less than 2 hours ago
  });
});

