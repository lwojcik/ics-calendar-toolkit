import { describe, expect, it } from 'vitest';

import { isShrunk, trackSequences } from '@ics/sequence';

const options = (runDate: string, nowIso = `${runDate}T10:00:00.000Z`) => ({
  runDate,
  nowIso,
  keepIdentityDays: 30,
  hash: (item: string) => item,
});

describe('isShrunk', () => {
  it('holds back a feed that lost most events, but only once it had enough of them', () => {
    const limits = {
      massDisappearanceRatio: 0.5,
      massDisappearanceMinEvents: 20,
    };

    expect(isShrunk({ previous: 40, current: 19, options: limits })).toBe(true);
    expect(isShrunk({ previous: 40, current: 20, options: limits })).toBe(
      false,
    );
    expect(isShrunk({ previous: 19, current: 0, options: limits })).toBe(false);
  });
});

describe('trackSequences', () => {
  it('starts at 0, bumps once per change, and counts what came and went', () => {
    const first = trackSequences({
      identities: {},
      items: new Map([
        ['a', 'one'],
        ['b', 'one'],
      ]),
      options: options('2026-10-24'),
    });

    expect(first.counts).toEqual({ added: 2, updated: 0, removed: 0 });
    expect(first.entries.map(({ sequence }) => sequence)).toEqual([0, 0]);

    const second = trackSequences({
      identities: first.identities,
      items: new Map([['a', 'two']]),
      options: options('2026-10-25', '2026-10-25T08:00:00.000Z'),
    });

    expect(second.counts).toEqual({ added: 0, updated: 1, removed: 1 });
    expect(second.entries).toEqual([
      {
        uid: 'a',
        item: 'two',
        sequence: 1,
        lastModified: '2026-10-25T08:00:00.000Z',
      },
    ]);

    const same = trackSequences({
      identities: second.identities,
      items: new Map([['a', 'two']]),
      options: options('2026-10-26'),
    });

    expect(same.counts).toEqual({ added: 0, updated: 0, removed: 0 });
    expect(same.entries[0].sequence).toBe(1);
  });

  it('bumps the SEQUENCE of a UID recovered from a feed (unknown hash) once', () => {
    const recovered = {
      a: { hash: null, sequence: 2, lastModified: '', lastSeen: '2026-10-24' },
    };
    const first = trackSequences({
      identities: recovered,
      items: new Map([['a', 'one']]),
      options: options('2026-10-25'),
    });

    expect(first.entries[0].sequence).toBe(3);
    const second = trackSequences({
      identities: first.identities,
      items: new Map([['a', 'one']]),
      options: options('2026-10-26'),
    });

    expect(second.entries[0].sequence).toBe(3);
  });

  it('forgets a UID after keepIdentityDays, and keeps its SEQUENCE before that', () => {
    const day1 = trackSequences({
      identities: {},
      items: new Map([['a', 'one']]),
      options: options('2026-10-01'),
    });
    const day20 = trackSequences({
      identities: day1.identities,
      items: new Map([['b', 'one']]),
      options: options('2026-10-20'),
    });

    expect(Object.keys(day20.identities).sort()).toEqual(['a', 'b']);
    const day36 = trackSequences({
      identities: day20.identities,
      items: new Map([['b', 'one']]),
      options: options('2026-11-05'),
    });

    expect(Object.keys(day36.identities)).toEqual(['b']);
    expect(Object.keys(day20.identities).sort()).toEqual(['a', 'b']);
  });
});
