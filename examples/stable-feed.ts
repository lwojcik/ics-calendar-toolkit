import { type CalendarEvent } from '@ics/events';
import { readIdentities } from '@ics/reader';
import { type Identity, trackSequences } from '@ics/sequence';

import { buildExampleFeed } from './build-feed';

interface Row {
  uid: string;
  title: string;
  day: string;
}

export const toEvent = ({
  row,
  sequence,
  lastModified,
}: {
  row: Row;
  sequence: number;
  lastModified: string;
}): CalendarEvent => ({
  uid: row.uid,
  time: {
    allDay: true,
    start: row.day,
    end: new Date(Date.parse(`${row.day}T00:00:00Z`) + 86_400_000)
      .toISOString()
      .slice(0, 10),
  },
  summary: row.title,
  location: null,
  geo: null,
  categories: [],
  description: '',
  url: `https://example.org/${row.uid}`,
  sequence,
  lastModified,
});

export const runOnce = ({
  rows,
  identities,
  runDate,
}: {
  rows: Row[];
  identities: Record<string, Identity>;
  runDate: string;
}) => {
  const tracked = trackSequences({
    identities,
    items: new Map(rows.map((row) => [row.uid, row])),
    options: {
      runDate,
      nowIso: `${runDate}T06:00:00.000Z`,
      keepIdentityDays: 30,
      hash: (row) => JSON.stringify(row),
    },
  });
  const events = tracked.entries.map(({ item, sequence, lastModified }) =>
    toEvent({ row: item, sequence, lastModified }),
  );

  return { ...tracked, events };
};

export const recoverIdentities = () => readIdentities(buildExampleFeed().ics);
