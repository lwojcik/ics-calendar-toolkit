import { describe, expect, it } from 'vitest';

import {
  buildFeed,
  type CalendarEvent,
  descriptionLines,
  eventLines,
  makeFeedBuilder,
} from '@ics/events';

import { HEADER } from './helpers';

const lines = (event: CalendarEvent, maxTextLength = 1000) =>
  eventLines({ event, maxTextLength, timeZoneId: HEADER.timeZone.id });

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  uid: 'a@x',
  time: {
    allDay: false,
    start: '2026-11-15T17:00:00',
    end: '2026-11-15T19:00:00',
  },
  summary: 'Concert',
  location: 'Park',
  geo: { lat: 52.24, lon: 21.05 },
  categories: ['Music', 'A, B'],
  description: 'About',
  url: 'https://example.org/events/concert',
  sequence: 2,
  lastModified: '2026-10-25T10:00:00.000Z',
  ...overrides,
});

describe('eventLines', () => {
  it('writes a timed event with its optional properties in the given zone', () => {
    expect(lines(event())).toMatchInlineSnapshot(`
      [
        "UID:a@x",
        "SEQUENCE:2",
        "DTSTAMP:20261025T100000Z",
        "LAST-MODIFIED:20261025T100000Z",
        "DTSTART;TZID=Europe/Berlin:20261115T170000",
        "DTEND;TZID=Europe/Berlin:20261115T190000",
        "SUMMARY:Concert",
        "LOCATION:Park",
        "GEO:52.24;21.05",
        "CATEGORIES:Music,A\\, B",
        "DESCRIPTION:About",
        "URL:https://example.org/events/concert",
        "STATUS:CONFIRMED",
        "TRANSP:TRANSPARENT",
      ]
    `);
  });

  it('writes the status the event names', () => {
    expect(lines(event({ status: 'CANCELLED' }))).toContain('STATUS:CANCELLED');
    expect(lines(event({ status: 'TENTATIVE' }))).toContain('STATUS:TENTATIVE');
  });

  it('writes an all-day event without location, GEO and CATEGORIES, cutting long text and stripping line breaks from the URL', () => {
    const result = lines(
      event({
        time: { allDay: true, start: '2026-11-16', end: '2026-11-18' },
        summary: 'x'.repeat(30),
        location: null,
        geo: null,
        categories: [],
        url: 'https://a\r\n/b',
      }),
      10,
    );

    expect(result).toContain('DTSTART;VALUE=DATE:20261116');
    expect(result).toContain('DTEND;VALUE=DATE:20261118');
    expect(result).toContain(`SUMMARY:${'x'.repeat(9)}…`);
    expect(result).toContain('URL:https://a/b');
    expect(
      result.some((line) => /^(LOCATION|GEO|CATEGORIES):/.test(line)),
    ).toBe(false);
  });
});

describe('buildFeed', () => {
  it('sorts events by start, whatever their order', () => {
    const later = event({
      uid: 'b@x',
      time: { allDay: true, start: '2026-11-16', end: '2026-11-17' },
    });
    const options = { header: HEADER, maxTextLength: 1000 };
    const first = buildFeed([later, event()], options);
    const second = buildFeed([event(), later], options);

    expect(first.ics).toBe(second.ics);
    expect(first.included.map((found) => found.uid)).toEqual(['a@x', 'b@x']);
    expect(first.ics).toContain('X-WR-CALNAME:Test');
    expect(first.ics).toContain('TZID:Europe/Berlin');
  });

  it('leaves out an event that throws or fails the per-event checks, and writes the rest', () => {
    const bad = event({
      uid: 'bad@x',
      time: {
        allDay: false,
        start: '2026-11-15T17:00:00',
        end: '2026-11-15T16:00:00',
      },
    });
    const build = buildFeed([event(), bad, event({ uid: 'throws@x' })], {
      header: HEADER,
      maxTextLength: 1000,
      render: (input) => {
        if (input.uid === 'throws@x') {
          throw new Error('boom');
        }

        return lines(input);
      },
    });

    expect(build.included.map((found) => found.uid)).toEqual(['a@x']);
    expect(build.invalid).toEqual([
      { uid: 'bad@x', reason: 'event bad@x: DTEND is not after DTSTART' },
      { uid: 'throws@x', reason: 'boom' },
    ]);
  });
});

describe('descriptionLines', () => {
  it('joins the lines, leaving out missing ones and the empty lines a missing first part leaves', () => {
    expect(
      descriptionLines(['About', '', 'Dates: x', null, 'https://x.test']),
    ).toBe('About\n\nDates: x\nhttps://x.test');
    expect(descriptionLines([null, '', 'Dates: x'])).toBe('Dates: x');
  });
});

describe('makeFeedBuilder', () => {
  const feed = makeFeedBuilder<{ maxTextLength: number }>(HEADER);
  const settings = { maxTextLength: 1000 };

  it('writes an event’s lines and a whole calendar like buildFeed', () => {
    expect(feed.eventLines(event(), settings)).toEqual(lines(event()));
    expect(feed.build({ events: [event()], settings }).ics).toBe(
      buildFeed([event()], { header: HEADER, maxTextLength: 1000 }).ics,
    );
  });

  it('lets a calendar replace the lines of an event', () => {
    const build = feed.build({
      events: [event()],
      settings,
      render: (found, given) => [...feed.eventLines(found, given), 'X-EXTRA:1'],
    });

    expect(build.ics).toContain('X-EXTRA:1');
  });
});
