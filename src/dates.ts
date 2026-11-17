import type { DateOnly, LocalDateTime } from '@ics/types';

export const MS_PER_MINUTE = 60_000;
export const MS_PER_DAY = 86_400_000;
export const MINUTES_PER_DAY = 1440;

const DATE_LENGTH = 10;
const SECONDS_LENGTH = 19;
const COMPACT_MINUTES_LENGTH = 13;
const CLOCK_START = 11;
const CLOCK_END = 16;

export const naiveUtc = (local: LocalDateTime) => Date.parse(`${local}Z`);

export const dateOf = (local: LocalDateTime): DateOnly =>
  local.slice(0, DATE_LENGTH);

export const clockOf = (local: LocalDateTime) =>
  local.slice(CLOCK_START, CLOCK_END);

export const compactMinutes = (local: LocalDateTime) =>
  local.replaceAll(/[:-]/g, '').slice(0, COMPACT_MINUTES_LENGTH);

export const addMinutesLocal = (
  local: LocalDateTime,
  minutes: number,
): LocalDateTime =>
  new Date(naiveUtc(local) + minutes * MS_PER_MINUTE)
    .toISOString()
    .slice(0, SECONDS_LENGTH);

export const addDays = (date: DateOnly, days: number): DateOnly =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, DATE_LENGTH);

export const daysBetween = (from: DateOnly, to: DateOnly): number =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      MS_PER_DAY,
  );

export const icsLocal = (local: LocalDateTime): string =>
  local.replaceAll(/[:-]/g, '');

export const icsUtc = (iso: string): string =>
  `${new Date(iso).toISOString().slice(0, SECONDS_LENGTH).replaceAll(/[:-]/g, '')}Z`;
