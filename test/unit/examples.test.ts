import { describe, expect, it } from 'vitest';

import { icsValidator } from '@ics/validator/ICSValidator.class';

import { buildExampleFeed } from '../../examples/build-feed';
import { recoverIdentities, runOnce } from '../../examples/stable-feed';

describe('examples', () => {
  it('build-feed writes a valid calendar', () => {
    const { ics, included, invalid } = buildExampleFeed();

    expect(invalid).toEqual([]);
    expect(included).toHaveLength(2);
    expect(icsValidator.validate(ics, 2).ok).toBe(true);
  });

  it('stable-feed bumps SEQUENCE only for the event that changed', () => {
    const rows = [
      { uid: 'a', title: 'Concert', day: '2026-11-15' },
      { uid: 'b', title: 'Fair', day: '2026-11-20' },
    ];
    const first = runOnce({ rows, identities: {}, runDate: '2026-11-01' });
    const second = runOnce({
      rows: [rows[0], { ...rows[1], title: 'Autumn fair' }],
      identities: first.identities,
      runDate: '2026-11-02',
    });

    expect(first.events.map((event) => event.sequence)).toEqual([0, 0]);
    expect(second.events.map((event) => event.sequence)).toEqual([0, 1]);
    expect(second.events[0].lastModified).toBe(first.events[0].lastModified);
  });

  it('recovers identities from a published feed', () => {
    expect(recoverIdentities().map(({ uid }) => uid)).toEqual([
      'meetup-1@example.org',
      'fair-1@example.org',
    ]);
  });
});
