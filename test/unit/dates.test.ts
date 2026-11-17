import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMinutesLocal,
  clockOf,
  compactMinutes,
  dateOf,
  daysBetween,
  icsLocal,
  icsUtc,
} from '@ics/dates';

describe('dates', () => {
  it('cuts the parts of a local date-time', () => {
    expect(dateOf('2026-11-15T17:30:00')).toBe('2026-11-15');
    expect(clockOf('2026-11-15T17:30:00')).toBe('17:30');
    expect(compactMinutes('2026-11-15T17:30:00')).toBe('20261115T1730');
  });

  it('does calendar and wall-clock arithmetic without a zone', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(addMinutesLocal('2026-11-15T23:30:00', 45)).toBe(
      '2026-11-16T00:15:00',
    );
  });

  it('writes the local and UTC forms of ICS', () => {
    expect(icsLocal('2026-11-15T17:30:00')).toBe('20261115T173000');
    expect(icsUtc('2026-10-25T10:00:00.000Z')).toBe('20261025T100000Z');
  });
});
