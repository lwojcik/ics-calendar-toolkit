import { describe, expect, it } from 'vitest';

import ICAL from '@ics/ical';
import { calendarText, escapeText, foldLine } from '@ics/ics';

import { HEADER as BASE_HEADER, TEST_ZONE } from './helpers';

const VTIMEZONE_LINES = TEST_ZONE.definition;
const HEADER = { ...BASE_HEADER, name: 'Łódź: Test, A;B' };

describe('ics', () => {
  it('escapes text', () => {
    expect(escapeText('a,b;c\\d\ne\r\nf\rg')).toBe(
      'a\\,b\\;c\\\\d\\ne\\nf\\ng',
    );
  });

  it('folds at 75 octets without splitting characters', () => {
    const line = `DESCRIPTION:${'ż'.repeat(100)}`;
    const folded = foldLine(line);

    expect(folded.every((part) => Buffer.byteLength(part) <= 75)).toBe(true);
    expect(folded.slice(1).every((part) => part.startsWith(' '))).toBe(true);
    expect(
      folded
        .map((part, index) => (index === 0 ? part : part.slice(1)))
        .join(''),
    ).toBe(line);
    expect(foldLine('short')).toEqual(['short']);
  });

  it('writes the header, the given time zone and each event, folded with CRLF', () => {
    const ics = calendarText(HEADER, [
      ['UID:1', `SUMMARY:${'x'.repeat(80)}`],
      ['UID:2'],
    ]);

    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    const lines = ics.split('\r\n').slice(0, -1);

    expect(lines.slice(0, 10)).toMatchInlineSnapshot(`
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//test//cal//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Łódź: Test\\, A\\;B",
        "X-WR-TIMEZONE:Europe/Berlin",
        "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
        "X-PUBLISHED-TTL:PT6H",
        "BEGIN:VTIMEZONE",
      ]
    `);
    expect(lines.slice(9, 9 + VTIMEZONE_LINES.length)).toEqual(VTIMEZONE_LINES);
    expect(lines.slice(9 + VTIMEZONE_LINES.length)).toEqual([
      'BEGIN:VEVENT',
      'UID:1',
      `SUMMARY:${'x'.repeat(67)}`,
      ` ${'x'.repeat(13)}`,
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:2',
      'END:VEVENT',
      'END:VCALENDAR',
    ]);
  });

  it('adds X-WR-CALDESC only when there is a description', () => {
    expect(calendarText(HEADER, [])).not.toContain('X-WR-CALDESC');
    expect(
      calendarText({ ...HEADER, description: 'About; a, b' }, []),
    ).toContain(
      '\r\nX-WR-CALDESC:About\\; a\\, b\r\nX-WR-TIMEZONE:Europe/Berlin\r\n',
    );
  });
});

describe('VTIMEZONE', () => {
  it('makes ical.js convert summer and winter times to the right UTC', () => {
    const ics = calendarText(HEADER, [
      ['UID:summer', 'DTSTART;TZID=Europe/Berlin:20260715T120000'],
      ['UID:winter', 'DTSTART;TZID=Europe/Berlin:20261215T120000'],
    ]);
    const calendar = new ICAL.Component(ICAL.parse(ics));
    const timezone = new ICAL.Timezone(
      calendar.getFirstSubcomponent('vtimezone')!,
    );
    const utc = calendar.getAllSubcomponents('vevent').map((vevent) => {
      const start = vevent.getFirstPropertyValue('dtstart') as ICAL.Time;

      start.zone = timezone;

      return start.toJSDate().toISOString();
    });

    expect(utc).toEqual([
      '2026-07-15T10:00:00.000Z',
      '2026-12-15T11:00:00.000Z',
    ]);
  });
});
