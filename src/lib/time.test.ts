import { describe, expect, it } from 'vitest';
import {
  formatConversationTime,
  formatDateDivider,
  formatLastSeen,
  formatMessageTime,
  isRecentlyOnline,
  isSameDay,
  isToday,
  isYesterday,
  sameMinute,
} from './time';

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('isSameDay / isToday / isYesterday', () => {
  it('compares calendar days ignoring time of day', () => {
    expect(isSameDay('2025-01-15T08:00:00', '2025-01-15T23:59:00')).toBe(true);
    expect(isSameDay('2025-01-15T23:59:00', '2025-01-16T00:01:00')).toBe(false);
  });

  it('detects today and yesterday relative to now', () => {
    expect(isToday(new Date().toISOString())).toBe(true);
    expect(isToday(daysAgo(1))).toBe(false);
    expect(isYesterday(daysAgo(1))).toBe(true);
    expect(isYesterday(new Date().toISOString())).toBe(false);
  });
});

describe('formatConversationTime', () => {
  it('returns empty string for invalid dates', () => {
    expect(formatConversationTime('not-a-date')).toBe('');
  });

  it('formats today as a time', () => {
    expect(formatConversationTime(new Date().toISOString())).not.toBe('');
  });

  it('returns Yesterday for one day ago', () => {
    expect(formatConversationTime(daysAgo(1))).toBe('Yesterday');
  });

  it('returns a weekday within the last 6 days', () => {
    const result = formatConversationTime(daysAgo(3));
    expect(result).not.toBe('');
    expect(result).not.toBe('Yesterday');
  });

  it('returns a short date for older timestamps', () => {
    expect(formatConversationTime(daysAgo(30))).toMatch(/\d{1,2}[\/\.-]\d{1,2}/);
  });
});

describe('formatMessageTime', () => {
  it('returns empty string for invalid dates', () => {
    expect(formatMessageTime('garbage')).toBe('');
  });

  it('formats a valid timestamp as a time', () => {
    expect(formatMessageTime(new Date().toISOString())).toMatch(/:\d{2}/);
  });
});

describe('formatDateDivider', () => {
  it('returns empty string for invalid dates', () => {
    expect(formatDateDivider('')).toBe('');
  });

  it('labels today and yesterday', () => {
    expect(formatDateDivider(new Date().toISOString())).toBe('Today');
    expect(formatDateDivider(daysAgo(1))).toBe('Yesterday');
  });

  it('returns a long date for older timestamps', () => {
    const result = formatDateDivider(daysAgo(30));
    expect(result).toMatch(/\d{4}/);
  });
});

describe('formatLastSeen', () => {
  it('reports offline when value is missing or invalid', () => {
    expect(formatLastSeen(null)).toBe('offline');
    expect(formatLastSeen(undefined)).toBe('offline');
    expect(formatLastSeen('junk')).toBe('offline');
  });

  it('formats recent last seen values', () => {
    expect(formatLastSeen(new Date().toISOString())).toMatch(/^last seen today at /);
    expect(formatLastSeen(daysAgo(1))).toMatch(/^last seen yesterday at /);
    expect(formatLastSeen(daysAgo(30))).toMatch(/^last seen \d{1,2}[\/\.-]\d{1,2}/);
  });
});

describe('isRecentlyOnline', () => {
  it('is false for missing values', () => {
    expect(isRecentlyOnline(null)).toBe(false);
    expect(isRecentlyOnline(undefined)).toBe(false);
    expect(isRecentlyOnline('junk')).toBe(false);
  });

  it('detects recent and stale timestamps', () => {
    expect(isRecentlyOnline(new Date().toISOString())).toBe(true);
    expect(isRecentlyOnline(daysAgo(1))).toBe(false);
  });

  it('respects a custom threshold', () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    expect(isRecentlyOnline(oneMinuteAgo, 30_000)).toBe(false);
    expect(isRecentlyOnline(oneMinuteAgo, 120_000)).toBe(true);
  });
});

describe('sameMinute', () => {
  it('matches timestamps within the same minute', () => {
    expect(sameMinute('2025-03-10T14:05:10', '2025-03-10T14:05:59')).toBe(true);
    expect(sameMinute('2025-03-10T14:05:59', '2025-03-10T14:06:00')).toBe(false);
    expect(sameMinute('2025-03-10T23:59:00', '2025-03-11T00:00:00')).toBe(false);
  });
});
