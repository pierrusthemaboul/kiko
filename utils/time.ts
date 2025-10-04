// /home/pierre/kiko/utils/time.ts

const PARIS_TIMEZONE = 'Europe/Paris';

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  }

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return asUTC - date.getTime();
}

function zonedDateTimeToUtc(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string,
): Date {
  const { year, month, day, hour = 0, minute = 0, second = 0 } = parts;
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

function shiftLocalDay(
  parts: { year: number; month: number; day: number },
  delta: number,
): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + delta);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function todayWindow(resetHour = 4): { startISO: string; endISO: string } {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: PARIS_TIMEZONE, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' });
  const parts = Object.fromEntries(dtf.formatToParts(now).map(p => [p.type, p.value])) as Record<string, string>;

  let dayParts = { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
  if (Number(parts.hour) < resetHour) {
    dayParts = shiftLocalDay(dayParts, -1);
  }

  const start = zonedDateTimeToUtc({ ...dayParts, hour: resetHour }, PARIS_TIMEZONE);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { startISO: start.toISOString(), endISO: end.toISOString() };
}