import { describe, expect, it } from 'vitest';

import { buildFeed, type CalendarEvent } from '@ics/events';
import { readEvents, readIdentities } from '@ics/reader';

import { HEADER } from './helpers';

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
  categories: ['Culture', 'A, B'],
  description: 'About',
  url: 'https://example.org/events/concert',
  sequence: 2,
  lastModified: '2026-10-25T10:00:00.000Z',
  ...overrides,
});

const feed = (events: CalendarEvent[]) =>
  buildFeed(events, { header: HEADER, maxTextLength: 10_000 }).ics;

describe('readEvents', () => {
  it('reads back exactly what buildFeed wrote', () => {
    const written = [
      event({
        sequence: 3,
        geo: { lat: -52.2141938100175, lon: 20.9799983868717 },
        description: 'Linia; druga, trzecia\\\nczwarta ż'.repeat(20),
      }),
      event({
        uid: 'b@x',
        time: { allDay: true, start: '2026-11-16', end: '2026-11-18' },
        location: null,
        geo: null,
        categories: [],
      }),
    ];
    const ics = feed(written);
    const read = readEvents(ics);

    expect(read).toEqual(written);
    expect(feed(read)).toBe(ics);
  });

  it('skips an event without a field buildFeed always writes, and defaults the rest', () => {
    const ics = feed([event()]);
    const without = (pattern: RegExp) => readEvents(ics.replace(pattern, ''));

    [
      /UID:[^\r]*\r\n/,
      /SUMMARY:[^\r]*\r\n/,
      /URL:[^\r]*\r\n/,
      /DTEND[^\r]*\r\n/,
      /DTSTART;TZID[^\r]*\r\n/,
      /LAST-MODIFIED:[^\r]*\r\n/,
    ].forEach((field) => expect(without(field), String(field)).toEqual([]));
    expect(
      readEvents(
        ics.replace(
          'DTSTART;TZID=Europe/Berlin:20261115T170000',
          'DTSTART;VALUE=DATE:20261115',
        ),
      ),
    ).toEqual([]);
    expect(
      readEvents(
        ics.replace('DTSTART;TZID=Europe/Berlin:20261115T170000', 'DTSTART:x'),
      ),
    ).toEqual([]);
    expect(without(/SEQUENCE:[^\r]*\r\n/)[0].sequence).toBe(0);
    expect(without(/DESCRIPTION:[^\r]*\r\n/)[0].description).toBe('');
    expect(without(/GEO:[^\r]*\r\n/)[0].geo).toBeNull();
    expect(without(/CATEGORIES:[^\r]*\r\n/)[0].categories).toEqual([]);
  });

  it('reads LF endings and lower-case names, ignores lines that are no property, and throws on what is no calendar', () => {
    const ics = feed([event()])
      .replace(/\r\n/g, '\n')
      .replace('SUMMARY:', 'summary:')
      .replace(
        'BEGIN:VEVENT',
        'X-OUTSIDE:1\nBEGIN:VEVENT\nnot a property\nX-REPEAT:1\nX-REPEAT:2',
      );

    expect(readEvents(ics)).toEqual([event()]);
    expect(() => readEvents('BEGIN:VCALENDAR\nEND:VEVENT\nUID:a')).toThrow();
    expect(() => readEvents('not a calendar')).toThrow();
    expect(() => readIdentities('')).toThrow();
  });
});

describe('readIdentities', () => {
  it('still gives the other events of a feed with a damaged line and an event it cannot read', () => {
    const ics = feed([event(), event({ uid: 'b@x' })])
      .replace('UID:a@x', 'a damaged line\r\nUID:a@x')
      .replace('DTSTART;TZID=Europe/Berlin:20261115T170000', 'DTSTART:x');

    expect(readEvents(ics).map((item) => item.uid)).toEqual(['b@x']);
    expect(readIdentities(ics).map((item) => item.uid)).toEqual(['a@x', 'b@x']);
  });

  it('reads UID, SEQUENCE and LAST-MODIFIED, with defaults for the missing', () => {
    const ics = feed([event({ sequence: 3 }), event({ uid: 'b@x' })]);

    expect(readIdentities(ics)).toEqual([
      { uid: 'a@x', sequence: 3, lastModified: '2026-10-25T10:00:00.000Z' },
      { uid: 'b@x', sequence: 2, lastModified: '2026-10-25T10:00:00.000Z' },
    ]);
    expect(
      readIdentities(
        ics
          .replace('SEQUENCE:3\r\n', '')
          .replace(/LAST-MODIFIED:[^\r]*\r\n/, ''),
      )[0],
    ).toEqual({ uid: 'a@x', sequence: 0, lastModified: null });
    expect(readIdentities(ics.replace('UID:b@x\r\n', ''))).toHaveLength(1);
  });
});
