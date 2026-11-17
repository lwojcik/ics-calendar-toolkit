import { describe, expect, it } from 'vitest';

import { calendarText } from '@ics/ics';
import {
  checkEvent,
  ICSValidator,
  icsValidator,
  parseProperty,
  unfold,
} from '@ics/validator/ICSValidator.class';

import { HEADER } from './helpers';

const countEvents = (text: string) => {
  if (/;[A-Z-]+="[^"\r\n]*:/.test(text)) {
    throw new Error('unterminated quote');
  }

  return text.split('\r\nBEGIN:VEVENT\r\n').length - 1;
};

const validator = new ICSValidator({ countEvents });

const EVENT = [
  'UID:one@test',
  'SEQUENCE:0',
  'DTSTAMP:20261020T100000Z',
  'DTSTART;TZID=Europe/Berlin:20261115T170000',
  'DTEND;TZID=Europe/Berlin:20261115T180000',
  'SUMMARY:Concert',
  'GEO:52.2;21',
  'STATUS:CONFIRMED',
];
const valid = calendarText(HEADER, [EVENT]);
const replace = (from: string | RegExp, to: string) => valid.replace(from, to);

describe('ICSValidator', () => {
  it('parses with ical.js unless told otherwise', () => {
    expect(icsValidator.validate(valid, 1)).toMatchObject({
      ok: true,
      events: 1,
    });
    expect(icsValidator.validate(valid).checks).toContain('ical.js round trip');
  });

  it('accepts a valid calendar, as text or bytes, with the expected count', () => {
    expect(validator.validate(valid, 1)).toMatchObject({ ok: true, events: 1 });
    expect(validator.validate(Buffer.from(valid)).ok).toBe(true);
    expect(validator.validate(valid).checks).toContain('ical.js round trip');
  });

  it.each([
    ['bare LF', valid.replace(/\r\n/g, '\n')],
    ['no final CRLF', valid.trimEnd()],
    [
      'a line over 75 octets',
      replace('SUMMARY:Concert', `SUMMARY:${'x'.repeat(80)}`),
    ],
    [
      'a control character',
      replace('SUMMARY:Concert', 'SUMMARY:Kon\u0001cert'),
    ],
    ['no VERSION', replace('VERSION:2.0\r\n', '')],
    ['no PRODID', replace(/PRODID:[^\r]*\r\n/, '')],
    ['two calendars', `${valid}${valid}`],
    ['unbalanced END', replace('END:VEVENT', 'END:VTODO')],
    ['unclosed component', replace('END:VCALENDAR\r\n', '')],
    ['a stray END', `${valid}END:VEVENT\r\n`],
    ['VEVENT outside VCALENDAR', `BEGIN:VEVENT\r\nEND:VEVENT\r\n${valid}`],
    ['content outside VCALENDAR', `X:1\r\n${valid}`],
    [
      'no components',
      'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:x\r\nEND:VCALENDAR\r\n',
    ],
    ['missing DTSTAMP', replace(/DTSTAMP:[^\r]*\r\n/, '')],
    ['missing UID', replace(/UID:[^\r]*\r\n/, '')],
    [
      'DTEND before DTSTART',
      replace(
        'DTEND;TZID=Europe/Berlin:20261115T180000',
        'DTEND;TZID=Europe/Berlin:20261115T160000',
      ),
    ],
    [
      'unknown TZID',
      replace('DTSTART;TZID=Europe/Berlin', 'DTSTART;TZID=Mars/Olympus'),
    ],
    ['bad STATUS', replace('STATUS:CONFIRMED', 'STATUS:MAYBE')],
    [
      'a date start with a date-time end',
      replace(
        'DTSTART;TZID=Europe/Berlin:20261115T170000',
        'DTSTART;VALUE=DATE:20261115',
      ),
    ],
    [
      'a malformed date-time',
      replace(
        'DTSTART;TZID=Europe/Berlin:20261115T170000',
        'DTSTART;TZID=Europe/Berlin:2026-11-15',
      ),
    ],
    ['bad GEO', replace('GEO:52.2;21', 'GEO:52,2;21')],
    [
      'duplicate UID',
      calendarText(HEADER, [
        EVENT,
        EVENT.map((line) => line.replace('Concert', 'Second')),
      ]),
    ],
    ['a parse error', replace('SEQUENCE:0', 'SEQUENCE;X="unterminated:0')],
  ])('rejects %s', (_name, ics) => {
    expect(validator.validate(ics).ok).toBe(false);
  });

  it('rejects invalid UTF-8 and a wrong event count', () => {
    expect(validator.validate(Uint8Array.from([0xff, 0xfe]))).toMatchObject({
      ok: false,
      errors: ['file is not valid UTF-8'],
    });
    expect(validator.validate(valid, 2).errors).toEqual([
      'expected 2 events, found 1',
    ]);
  });

  it('reports what the full parser makes of the file', () => {
    expect(
      new ICSValidator({ countEvents: () => 0 }).validate(valid).errors,
    ).toEqual(['ical.js found 0 events, expected 1']);
    expect(
      validator.validate(replace('SEQUENCE:0', 'SEQUENCE;X="a:0')).errors,
    ).toEqual(['ical.js could not parse the file: unterminated quote']);
  });

  it('parses properties with quoted parameters, and unfolds lines', () => {
    expect(parseProperty('ATTENDEE;CN="a:b";ROLE=X:mailto:x')).toEqual({
      name: 'ATTENDEE',
      params: { CN: 'a:b', ROLE: 'X' },
      value: 'mailto:x',
    });
    expect(parseProperty('NOVALUE')).toEqual({
      name: 'NOVALUE',
      params: {},
      value: '',
    });
    expect(unfold(['A:b', ' c', '\td'])).toEqual(['A:bcd']);
    expect(unfold([' orphan'])).toEqual([' orphan']);
  });

  it('checks one event on its own, for dates as well as date-times', () => {
    expect(checkEvent(EVENT, new Set(['Europe/Berlin']))).toEqual([]);
    expect(
      checkEvent(
        [
          'UID:x',
          'DTSTAMP:1',
          'DTSTART;VALUE=DATE:20261102',
          'DTEND;VALUE=DATE:20261101',
        ],
        new Set(),
      ),
    ).toEqual(['event x: DTEND is not after DTSTART']);
    expect(checkEvent(['DTSTART:20261102T100000'], new Set())).toEqual([
      'event without UID: UID missing',
      'event without UID: DTSTAMP missing',
    ]);
  });
});
