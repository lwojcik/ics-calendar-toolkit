# ics-calendar-toolkit

[![npm version](https://img.shields.io/npm/v/ics-calendar-toolkit)](https://www.npmjs.com/package/ics-calendar-toolkit)
[![codecov](https://codecov.io/gh/lwojcik/ics-calendar-toolkit/graph/badge.svg)](https://codecov.io/gh/lwojcik/ics-calendar-toolkit)
[![Build status](https://ci.appveyor.com/api/projects/status/8qgkia8jo6pgvqtt/branch/main?svg=true)](https://ci.appveyor.com/project/lwojcik/ics-calendar-toolkit/branch/main)

Build, read and validate `.ics` calendar feeds and keep subscribers from being notified about events that haven't changed.

## Install

```sh
npm install ics-calendar-toolkit
```

## What it does for you

- **Writes a valid feed.** Escaping, line folding (without splitting a UTF-8 character) and CRLF endings are taken care of.
- **Isolates bad events.** One broken event is left out and reported. The rest of the feed still goes out.
- **Keeps subscribers calm.** `SEQUENCE` and `LAST-MODIFIED` change only when an event's content does, so calendar apps don't show phantom updates.
- **Catches problems before subscribers do.** Validate the final file before you publish it.
- **Recovers state.** Read identities back from a feed you already published.
- **Cleans up the source.** Drops events your source lists twice, and warns you when a feed suddenly shrinks.

The examples below are real files in [`examples/`](examples/), type-checked and run by the tests. Everything is imported from `ics-calendar-toolkit`.

## Write a feed

From [`examples/build-feed.ts`](examples/build-feed.ts):

```ts
import { buildFeed, type CalendarEvent } from 'ics-calendar-toolkit';

const events: CalendarEvent[] = [
  {
    uid: 'meetup-1@example.org',
    time: {
      allDay: false,
      start: '2026-11-15T18:30:00',
      end: '2026-11-15T20:00:00',
    },
    summary: 'Monthly meetup',
    location: 'Town hall, Main Street 1',
    geo: { lat: 52.52, lon: 13.405 },
    categories: ['Community'],
    description: 'Talks and snacks.\nBring a friend.',
    url: 'https://example.org/meetups/1',
    sequence: 0,
    lastModified: '2026-11-01T09:00:00.000Z',
  },
  {
    uid: 'fair-1@example.org',
    time: { allDay: true, start: '2026-11-20', end: '2026-11-23' },
    summary: 'Autumn fair',
    location: null,
    geo: null,
    categories: [],
    description: '',
    url: 'https://example.org/fair',
    sequence: 1,
    lastModified: '2026-11-02T09:00:00.000Z',
  },
];

const { ics, included, invalid } = buildFeed(events, {
  header: {
    prodId: '-//example//community//EN',
    name: 'Community events',
    refreshInterval: 'PT6H',
    timeZone: BERLIN,
  },
  maxTextLength: 1000,
});
```

Events are sorted, and any that fail their checks end up in `invalid` with the reason instead of breaking the whole feed. Publish `ics`.

An all-day event's `end` is the day _after_ its last day, as in the iCalendar format itself.

## Only bump `SEQUENCE` when something changed

Calendar apps treat a higher `SEQUENCE` as "this event was updated". If your script regenerates the feed every few hours, you want that number to move only when the event really changed.

Save the `identities` from each run (a JSON file is fine) and pass them into the next one. From [`examples/stable-feed.ts`](examples/stable-feed.ts):

```ts
import { trackSequences } from 'ics-calendar-toolkit';

const tracked = trackSequences({
  identities,
  items: new Map(rows.map((row) => [row.uid, row])),
  options: {
    runDate: '2026-11-02',
    nowIso: '2026-11-02T06:00:00.000Z',
    keepIdentityDays: 30,
    hash: (row) => JSON.stringify(row),
  },
});

tracked.entries;
tracked.counts;
tracked.identities;
```

- An unchanged row keeps its `sequence` and `lastModified`, so subscribers see nothing new.
- A changed row gets exactly one bump.
- A UID that disappears is forgotten after `keepIdentityDays`.
- `counts` reports how many were added, updated and removed, which is handy for logs.

## Recover state from a published feed

If you lose your stored identities, read them back from the feed that's live:

```ts
import { readIdentities } from 'ics-calendar-toolkit';

const identities = readIdentities(publishedFeedText);
```

## Validate before publishing

```ts
import { icsValidator } from 'ics-calendar-toolkit';

const result = icsValidator.validate(ics, included.length);

if (!result.ok) {
  throw new Error(result.errors.join('\n'));
}
```

The validator checks the file itself (encoding, line endings, line length, structure) and every event (required properties, known time zones, an end that makes sense, valid dates and coordinates, unique UIDs, the expected event count). It finishes with a full `ical.js` parse.

## Time zones

A timed event is a local date-time like `2026-11-15T17:00:00`, read in the zone named by `header.timeZone`:

```ts
const header = {
  prodId: '-//example//feed//EN',
  name: 'My calendar',
  refreshInterval: 'PT6H',
  timeZone: {
    id: 'Europe/Berlin',
    definition: [/* BEGIN:VTIMEZONE … END:VTIMEZONE lines */],
  },
};
```

The toolkit doesn't generate `VTIMEZONE` blocks. Your lines are written out exactly as given.

## Good to know

**Output is byte-stable.** The same input always produces the same bytes. Changing property order or folding would rewrite every event for every subscriber, so that counts as a breaking change. Snapshot tests guard it.

**Known limits**

- `readEvents` is meant for feeds written by this toolkit. If an event in the feed has no `URL` (or another property the toolkit always writes), it is silently skipped rather than returned.
- Local times are plain strings, so DST gaps and overlaps are up to you.

## Development

```sh
npm ci
npm test            # unit tests, 100% coverage enforced
npm run typecheck
npm run lint
npm run format      # or format:check
npm run build       # dist/ with the bundled JavaScript and types
```
