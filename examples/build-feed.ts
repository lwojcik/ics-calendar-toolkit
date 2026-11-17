import { buildFeed, type CalendarEvent } from '@ics/events';

import { BERLIN } from './zone';

const EVENTS: CalendarEvent[] = [
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

export const buildExampleFeed = () =>
  buildFeed(EVENTS, {
    header: {
      prodId: '-//example//community//EN',
      name: 'Community events',
      description: 'Meetups and fairs',
      refreshInterval: 'PT6H',
      timeZone: BERLIN,
    },
    maxTextLength: 1000,
  });
