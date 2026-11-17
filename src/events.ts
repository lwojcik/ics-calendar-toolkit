import { icsLocal, icsUtc } from '@ics/dates';
import type {
  CalendarBuild,
  CalendarEvent,
  FeedOptions,
} from '@ics/events.types';
import { type CalendarHeader, calendarText, escapeText } from '@ics/ics';
import { truncate } from '@ics/text';
import { checkEvent } from '@ics/validator/ICSValidator.class';

export type {
  CalendarBuild,
  CalendarEvent,
  EventContent,
  FeedOptions,
} from '@ics/events.types';

export interface EventLinesOptions {
  event: CalendarEvent;
  maxTextLength: number;
  timeZoneId: string;
}

export const eventLines = ({
  event,
  maxTextLength,
  timeZoneId,
}: EventLinesOptions): string[] => {
  const text = (value: string) => escapeText(truncate(value, maxTextLength));
  const { time } = event;
  const when = time.allDay
    ? [
        `DTSTART;VALUE=DATE:${time.start.replaceAll('-', '')}`,
        `DTEND;VALUE=DATE:${time.end.replaceAll('-', '')}`,
      ]
    : [
        `DTSTART;TZID=${timeZoneId}:${icsLocal(time.start)}`,
        `DTEND;TZID=${timeZoneId}:${icsLocal(time.end)}`,
      ];

  return [
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence}`,
    `DTSTAMP:${icsUtc(event.lastModified)}`,
    `LAST-MODIFIED:${icsUtc(event.lastModified)}`,
    ...when,
    `SUMMARY:${text(event.summary)}`,
    ...(event.location ? [`LOCATION:${text(event.location)}`] : []),
    ...(event.geo ? [`GEO:${event.geo.lat};${event.geo.lon}`] : []),
    ...(event.categories.length
      ? [`CATEGORIES:${event.categories.map(escapeText).join(',')}`]
      : []),
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url.replaceAll(/[\n\r]/g, '')}`,
    `STATUS:${event.status ?? 'CONFIRMED'}`,
    'TRANSP:TRANSPARENT',
  ];
};

export const buildFeed = (
  events: CalendarEvent[],
  options: FeedOptions,
): CalendarBuild => {
  const {
    header,
    maxTextLength,
    render = (event) =>
      eventLines({ event, maxTextLength, timeZoneId: header.timeZone.id }),
  } = options;
  const timezones = new Set([header.timeZone.id]);
  const sorted = events.toSorted(
    (first, second) =>
      first.time.start.localeCompare(second.time.start) ||
      first.uid.localeCompare(second.uid),
  );

  type Built =
    | { event: CalendarEvent; lines: string[] }
    | { event: CalendarEvent; reason: string };
  const built = sorted.map((event): Built => {
    try {
      const lines = render(event);
      const problems = checkEvent(lines, timezones);

      return problems.length > 0
        ? { event, reason: problems.join('; ') }
        : { event, lines };
    } catch (error) {
      return { event, reason: (error as Error).message };
    }
  });
  const ok = built.filter((item) => 'lines' in item);

  return {
    ics: calendarText(
      header,
      ok.map((item) => item.lines),
    ),
    included: ok.map((item) => item.event),
    invalid: built.flatMap((item) =>
      'reason' in item ? { uid: item.event.uid, reason: item.reason } : [],
    ),
  };
};

export const descriptionLines = (lines: (string | null)[]): string =>
  lines
    .filter((line) => line !== null)
    .join('\n')
    .replace(/^\n+/, '');

export const makeFeedBuilder = <S extends { maxTextLength: number }>(
  header: CalendarHeader,
) => {
  const lines = (event: CalendarEvent, settings: S) =>
    eventLines({
      event,
      maxTextLength: settings.maxTextLength,
      timeZoneId: header.timeZone.id,
    });

  return {
    eventLines: lines,
    build: ({
      events,
      settings,
      render = lines,
    }: {
      events: CalendarEvent[];
      settings: S;
      render?: (event: CalendarEvent, settings: S) => string[];
    }): CalendarBuild =>
      buildFeed(events, {
        header,
        maxTextLength: settings.maxTextLength,
        render: (event) => render(event, settings),
      }),
  };
};
