export const escapeText = (text: string): string =>
  text
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n|\r/g, '\\n');

const MAX_LINE_OCTETS = 75;

const UTF8_CONTINUATION_MASK = 192;
const UTF8_CONTINUATION = 128;
const cutPoint = (bytes: Buffer, end: number): number =>
  (bytes.readUInt8(end) & UTF8_CONTINUATION_MASK) === UTF8_CONTINUATION
    ? cutPoint(bytes, end - 1)
    : end;

const foldFrom = (text: string, isFirst: boolean): string[] => {
  const limit = isFirst ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
  const bytes = Buffer.from(text, 'utf-8');

  if (bytes.length <= limit) {
    return [isFirst ? text : ` ${text}`];
  }

  const end = cutPoint(bytes, limit);
  const head = bytes.subarray(0, end).toString('utf-8');

  return [
    isFirst ? head : ` ${head}`,
    ...foldFrom(bytes.subarray(end).toString('utf-8'), false),
  ];
};

export const foldLine = (line: string): string[] => foldFrom(line, true);

export interface CalendarZone {
  id: string;
  definition: string[];
}

export interface CalendarHeader {
  prodId: string;
  timeZone: CalendarZone;
  name: string;
  description?: string;
  refreshInterval: string;
}

export const calendarText = (
  header: CalendarHeader,
  events: string[][],
): string => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${header.prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(header.name)}`,
    ...(header.description === undefined
      ? []
      : [`X-WR-CALDESC:${escapeText(header.description)}`]),
    `X-WR-TIMEZONE:${header.timeZone.id}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${header.refreshInterval}`,
    `X-PUBLISHED-TTL:${header.refreshInterval}`,
    ...header.timeZone.definition,
    ...events.flatMap((lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT']),
    'END:VCALENDAR',
  ];

  return `${lines.flatMap(foldLine).join('\r\n')}\r\n`;
};
