const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function isToday(date: Date | string): boolean {
  return isSameDay(date, new Date());
}

export function isYesterday(date: Date | string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

export function formatConversationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return timeFormatter.format(date);
  if (isYesterday(date)) return 'Yesterday';
  const difference = Date.now() - date.getTime();
  if (difference < 6 * 24 * 60 * 60 * 1000) return weekdayFormatter.format(date);
  return shortDateFormatter.format(date);
}

export function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return timeFormatter.format(date);
}

export function formatDateDivider(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  const difference = Date.now() - date.getTime();
  if (difference >= 0 && difference < 6 * 24 * 60 * 60 * 1000) {
    return weekdayFormatter.format(date);
  }
  return longDateFormatter.format(date);
}

export function formatLastSeen(value: string | null | undefined): string {
  if (!value) return 'offline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'offline';
  if (isToday(date)) return `last seen today at ${timeFormatter.format(date)}`;
  if (isYesterday(date)) return `last seen yesterday at ${timeFormatter.format(date)}`;
  return `last seen ${shortDateFormatter.format(date)}`;
}

export function isRecentlyOnline(value: string | null | undefined, thresholdMs = 120_000): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time < thresholdMs;
}

export function sameMinute(a: string, b: string): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate() &&
    dateA.getHours() === dateB.getHours() &&
    dateA.getMinutes() === dateB.getMinutes()
  );
}
