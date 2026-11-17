import type { CalendarEvent } from '@ics/events';
import ICAL from '@ics/ical';

const vevents = (feed: string) => {
  const lines = feed
    .split(/\r?\n/)
    .filter((line) => /(?:^[\t ])|[:;]/.test(line));

  return new ICAL.Component(
    ICAL.parse(lines.join('\r\n')) as unknown[],
  ).getAllSubcomponents('vevent');
};

const eachEvent = <T>(
  feed: string,
  read: (vevent: ICAL.Component) => T[],
): T[] =>
  vevents(feed).flatMap((vevent) => {
    try {
      return read(vevent);
    } catch {
      return [];
    }
  });

const text = (vevent: ICAL.Component, name: string): string | null => {
  const value = vevent.getFirstPropertyValue(name);

  return typeof value === 'string' ? value : null;
};

const time = (vevent: ICAL.Component, name: string) => {
  const value = vevent.getFirstPropertyValue(name);

  return value instanceof ICAL.Time && value.zone !== ICAL.Timezone.utcTimezone
    ? value
    : null;
};

const lastModifiedOf = (vevent: ICAL.Component): string | null => {
  const value = vevent.getFirstPropertyValue('last-modified');

  return value instanceof ICAL.Time && value.zone === ICAL.Timezone.utcTimezone
    ? value.toJSDate().toISOString()
    : null;
};

const sequence = (vevent: ICAL.Component) =>
  Number(vevent.getFirstPropertyValue('sequence') ?? 0);

const requiredFields = (vevent: ICAL.Component) => {
  const [uid, summary, url] = ['uid', 'summary', 'url'].map((name) =>
    text(vevent, name),
  );
  const start = time(vevent, 'dtstart');
  const end = time(vevent, 'dtend');
  const lastModified = lastModifiedOf(vevent);

  return uid === null ||
    summary === null ||
    url === null ||
    !start ||
    !end ||
    start.isDate !== end.isDate ||
    lastModified === null
    ? null
    : { uid, summary, url, start, end, lastModified };
};

export const readEvents = (feed: string): CalendarEvent[] =>
  eachEvent(feed, (vevent) => {
    const required = requiredFields(vevent);

    if (!required) {
      return [];
    }

    const { uid, summary, url, start, end, lastModified } = required;
    const geo = vevent.getFirstPropertyValue('geo') as number[] | null;

    return [
      {
        uid,
        sequence: sequence(vevent),
        lastModified,
        time: {
          allDay: start.isDate,
          start: start.toString(),
          end: end.toString(),
        },
        summary,
        location: text(vevent, 'location'),
        geo: geo ? { lat: geo[0], lon: geo[1] } : null,
        categories: (vevent.getFirstProperty('categories')?.getValues() ??
          []) as string[],
        description: text(vevent, 'description') ?? '',
        url,
      },
    ];
  });

export interface FeedIdentity {
  uid: string;
  sequence: number;
  lastModified: string | null;
}

export const readIdentities = (feed: string): FeedIdentity[] =>
  eachEvent(feed, (vevent) => {
    const uid = text(vevent, 'uid');

    return uid === null
      ? []
      : [
          {
            uid,
            sequence: sequence(vevent),
            lastModified: lastModifiedOf(vevent),
          },
        ];
  });
