/* eslint-disable security/detect-unsafe-regex -- the text is a page or feed this run fetched, never a request, and the patterns are anchored or bounded */

import ICAL from '@ics/ical';

export const ALLOWED_STATUSES = ['TENTATIVE', 'CONFIRMED', 'CANCELLED'];
export const MAX_OCTETS = 75;
// eslint-disable-next-line no-control-regex -- the pattern exists to find control characters
export const CONTROL = /[\u{0}-\u{8}\u{A}-\u{1F}\u{7F}]/u;

export interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

export interface ICSValidatorOptions {
  countEvents?: (text: string) => number;
}

export const decodeUtf8 = (bytes: Uint8Array): string | null => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
};

export const countWithIcalJs = (text: string) =>
  new ICAL.Component(ICAL.parse(text) as unknown[]).getAllSubcomponents(
    'vevent',
  ).length;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  events: number;
  checks: string[];
}

const colonOutsideQuotes = (line: string) => {
  const parts = line.split('"');
  const outside = parts.findIndex(
    (part, index) => index % 2 === 0 && part.includes(':'),
  );

  return outside === -1
    ? -1
    : parts.slice(0, outside).join('"').length +
        Number(outside > 0) +
        parts[outside].indexOf(':');
};

export const parseProperty = (line: string): Property => {
  const colon = colonOutsideQuotes(line);
  const head = colon === -1 ? line : line.slice(0, colon);
  const [name, ...rawParameters] = head.split(';');
  const parameters = Object.fromEntries(
    rawParameters.map((parameter) => {
      const [key, ...rest] = parameter.split('=');

      return [key.toUpperCase(), rest.join('=').replaceAll(/^"|"$/g, '')];
    }),
  );

  return {
    name: name.toUpperCase(),
    params: parameters,
    value: colon === -1 ? '' : line.slice(colon + 1),
  };
};

const isContinuation = (line: string) =>
  line.startsWith(' ') || line.startsWith('\t');

export const unfold = (physicalLines: string[]): string[] => {
  const starts = physicalLines.flatMap((line, index) =>
    index > 0 && isContinuation(line) ? [] : index,
  );

  return starts.map((start, position) => {
    const next = starts[position + 1] ?? physicalLines.length;
    const continuations = physicalLines
      .slice(start + 1, next)
      .map((line) => line.slice(1));

    return [physicalLines[start], ...continuations].join('');
  });
};

interface EventProperties {
  where: string;
  get: (name: string) => Property | undefined;
  bounds: Property[];
}

const presenceErrors = (
  { where, get, bounds }: EventProperties,
  timezones: Set<string>,
) => [
  ...['UID', 'DTSTAMP', 'DTSTART']
    .filter((required) => !get(required)?.value)
    .map((required) => `${where}: ${required} missing`),
  ...bounds
    .filter(
      (property) =>
        property.params.TZID && !timezones.has(property.params.TZID),
    )
    .map(
      (property) =>
        `${where}: ${property.name} uses unknown TZID ${property.params.TZID}`,
    ),
];

const boundsErrors = ({ where, get, bounds }: EventProperties) => {
  const start = get('DTSTART');
  const end = get('DTEND');

  return [
    ...(start &&
    end &&
    !(end.value > start.value && end.params.TZID === start.params.TZID)
      ? [`${where}: DTEND is not after DTSTART`]
      : []),
    ...(start && end && start.params.VALUE !== end.params.VALUE
      ? [`${where}: DTSTART and DTEND are not both dates or both date-times`]
      : []),
    ...bounds
      .filter(
        (property) =>
          !(
            property.params.VALUE === 'DATE' ? /^\d{8}$/ : /^\d{8}T\d{6}Z?$/
          ).test(property.value),
      )
      .map(
        (property) =>
          `${where}: ${property.name} ${property.value} is not a valid value`,
      ),
  ];
};

const valueErrors = ({ where, get }: EventProperties) => {
  const geo = get('GEO');
  const status = get('STATUS');

  return [
    ...(geo && !/^-?\d{1,3}(\.\d+)?;-?\d{1,3}(\.\d+)?$/.test(geo.value)
      ? [`${where}: GEO ${geo.value} is not latitude;longitude`]
      : []),
    ...(status && !ALLOWED_STATUSES.includes(status.value)
      ? [`${where}: STATUS ${status.value} not allowed`]
      : []),
  ];
};

export const checkEvent = (
  lines: string[],
  timezones: Set<string>,
): string[] => {
  const properties = lines.map(parseProperty);
  const get = (name: string) =>
    properties.find((property) => property.name === name);
  const uid = get('UID')?.value ?? '';
  const event: EventProperties = {
    where: uid ? `event ${uid}` : 'event without UID',
    get,
    bounds: [get('DTSTART'), get('DTEND')].filter(
      (property) => property !== undefined,
    ),
  };

  return [
    ...presenceErrors(event, timezones),
    ...boundsErrors(event),
    ...valueErrors(event),
  ];
};
