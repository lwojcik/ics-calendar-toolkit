import {
  checkEvent,
  CONTROL,
  MAX_OCTETS,
  parseProperty,
  type Property,
} from '@ics/validator/event-checks';

const EXCERPT_LENGTH = 40;

interface BeginOptions {
  value: string;
  parent: string | undefined;
  depth: number;
}

const isAllowedBegin = ({ value, parent, depth }: BeginOptions) =>
  (value === 'VCALENDAR' && depth === 0) ||
  (['VEVENT', 'VTIMEZONE'].includes(value) && parent === 'VCALENDAR') ||
  (['STANDARD', 'DAYLIGHT'].includes(value) && parent === 'VTIMEZONE');

interface AdvanceOptions {
  scan: Scan;
  line: string;
  property: Property;
}

const advance = ({ scan, line, property }: AdvanceOptions) => {
  if (property.name === 'BEGIN') {
    return begin(scan, property.value);
  }

  return property.name === 'END'
    ? end(scan, property.value)
    : content(scan, line);
};

export const lineErrors = (text: string, physical: string[]): string[] => [
  ...(/[\n\r]/.test(text.replaceAll('\r\n', '')) || !text.endsWith('\r\n')
    ? ['line endings are not all CRLF']
    : []),
  ...physical.flatMap((line, index) => [
    ...(Buffer.byteLength(line, 'utf-8') > MAX_OCTETS
      ? [`line ${index + 1} is longer than ${MAX_OCTETS} octets`]
      : []),
    ...(CONTROL.test(line)
      ? [`line ${index + 1} contains a control character`]
      : []),
  ]),
];

export interface Structure {
  errors: string[];
  calendars: number;
  components: number;
  timezones: Set<string>;
  calendarProps: Map<string, string>;
  events: string[][];
  unclosed: string[];
}

interface Scan extends Structure {
  eventLines: string[] | null;
}

const begin = (scan: Scan, value: string): Scan => {
  const parent = scan.unclosed.at(-1);
  const isAllowed = isAllowedBegin({
    value,
    parent,
    depth: scan.unclosed.length,
  });

  return {
    ...scan,
    errors: isAllowed
      ? scan.errors
      : [
          ...scan.errors,
          `BEGIN:${value} is not allowed inside ${parent ?? 'the file root'}`,
        ],
    calendars: scan.calendars + (value === 'VCALENDAR' ? 1 : 0),
    components: scan.components + (parent === 'VCALENDAR' ? 1 : 0),
    unclosed: [...scan.unclosed, value],
    eventLines: value === 'VEVENT' ? [] : scan.eventLines,
  };
};

const end = (scan: Scan, value: string): Scan => {
  const open = scan.unclosed.at(-1);
  const closes = value === 'VEVENT' && scan.eventLines;

  return {
    ...scan,
    errors:
      open === value
        ? scan.errors
        : [...scan.errors, `END:${value} does not close ${open ?? 'anything'}`],
    unclosed: scan.unclosed.slice(0, -1),
    events: closes ? [...scan.events, closes] : scan.events,
    eventLines: closes ? null : scan.eventLines,
  };
};

const content = (scan: Scan, line: string): Scan => {
  const property = parseProperty(line);
  const parent = scan.unclosed.at(-1);

  if (parent === 'VCALENDAR') {
    return {
      ...scan,
      calendarProps: new Map([
        ...scan.calendarProps,
        [property.name, property.value],
      ]),
    };
  }

  if (parent === 'VTIMEZONE' && property.name === 'TZID') {
    return { ...scan, timezones: new Set([...scan.timezones, property.value]) };
  }

  if (scan.eventLines && parent === 'VEVENT') {
    return { ...scan, eventLines: [...scan.eventLines, line] };
  }

  return scan.unclosed.length === 0
    ? {
        ...scan,
        errors: [
          ...scan.errors,
          `content outside VCALENDAR: ${line.slice(0, EXCERPT_LENGTH)}`,
        ],
      }
    : scan;
};

export const scanStructure = (lines: string[]): Structure => {
  // eslint-disable-next-line no-restricted-syntax -- the scan carries from one line to the next
  let scan: Scan = {
    errors: [],
    calendars: 0,
    components: 0,
    timezones: new Set<string>(),
    calendarProps: new Map<string, string>(),
    events: [],
    unclosed: [],
    eventLines: null,
  };

  // eslint-disable-next-line no-restricted-syntax -- each line is read in the state the lines before it left
  for (const line of lines) {
    const property = parseProperty(line);

    scan = advance({ scan, line, property });
  }

  const { errors, calendars, components, timezones, calendarProps } = scan;

  return {
    errors,
    calendars,
    components,
    timezones,
    calendarProps,
    events: scan.events,
    unclosed: scan.unclosed,
  };
};

export const wholeFileErrors = ({
  unclosed,
  calendars,
  calendarProps,
  components,
}: Structure): string[] => [
  ...(unclosed.length > 0
    ? [`unclosed components: ${unclosed.join(', ')}`]
    : []),
  ...(calendars !== 1
    ? [`expected exactly one VCALENDAR, found ${calendars}`]
    : []),
  ...(calendarProps.get('VERSION') !== '2.0' || !calendarProps.get('PRODID')
    ? ['VCALENDAR needs VERSION:2.0 and PRODID']
    : []),
  ...(components === 0 ? ['VCALENDAR has no components'] : []),
];

export const eventErrors = ({
  events,
  timezones,
}: Pick<Structure, 'events' | 'timezones'>): string[] => {
  const uids = events.map(
    (event) =>
      event.map(parseProperty).find((property) => property.name === 'UID')
        ?.value,
  );

  return events.flatMap((event, index) => {
    const uid = uids[index];
    const duplicate = uid && uids.indexOf(uid) < index;

    return [
      ...checkEvent(event, timezones),
      ...(duplicate ? [`duplicate UID ${uid}`] : []),
    ];
  });
};
