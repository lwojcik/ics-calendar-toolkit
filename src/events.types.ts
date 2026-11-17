import { type CalendarHeader } from '@ics/ics';
import type { EventTime, LocalDateTime, Nullable } from '@ics/types';

export interface EventContent {
  uid: string;
  time: EventTime;
  summary: string;
  location: Nullable<string>;
  geo: Nullable<{ lat: number; lon: number }>;
  categories: string[];
  description: string;
  url: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

export interface CalendarEvent extends EventContent {
  sequence: number;
  lastModified: string;
}

export interface CalendarBuild {
  ics: string;
  included: CalendarEvent[];
  invalid: { uid: string; reason: string }[];
}

export interface UidForOptions {
  url: string;
  time: EventTime;
  dates: number;
  calendarId: string;
}

export interface IsRecentOptions {
  time: EventTime;
  now: LocalDateTime;
  days: number;
}

export interface FeedOptions {
  header: CalendarHeader;
  maxTextLength: number;
  render?: (event: CalendarEvent) => string[];
}
