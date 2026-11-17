import {
  countWithIcalJs,
  decodeUtf8,
  type ICSValidatorOptions,
  unfold,
  type ValidationResult,
} from '@ics/validator/event-checks';
import {
  eventErrors,
  lineErrors,
  scanStructure,
  type Structure,
  wholeFileErrors,
} from '@ics/validator/structure';

export * from '@ics/validator/event-checks';

export class ICSValidator {
  private readonly options: ICSValidatorOptions;

  constructor(options: ICSValidatorOptions = {}) {
    this.options = options;
  }

  validate(
    input: string | Uint8Array,
    expectedEvents?: number,
  ): ValidationResult {
    const text = typeof input === 'string' ? input : decodeUtf8(input);

    if (text === null) {
      return {
        ok: false,
        errors: ['file is not valid UTF-8'],
        events: 0,
        checks: [],
      };
    }

    const physical = text.split('\r\n').slice(0, -1);
    const structure = scanStructure(unfold(physical));
    const errors = [
      ...lineErrors(text, physical),
      ...structure.errors,
      ...wholeFileErrors(structure),
      ...eventErrors(structure),
      ...(expectedEvents !== undefined &&
      structure.events.length !== expectedEvents
        ? [
            `expected ${expectedEvents} events, found ${structure.events.length}`,
          ]
        : []),
    ];
    const roundTrip =
      errors.length === 0 ? this.roundTrip(text, structure) : [];

    return {
      ok: errors.length + roundTrip.length === 0,
      errors: [...errors, ...roundTrip],
      events: structure.events.length,
      checks: [
        'utf-8',
        'crlf',
        'line-length',
        'control-characters',
        'structure',
        'events',
        'unique-uids',
        ...(errors.length === 0 ? ['ical.js round trip'] : []),
      ],
    };
  }

  private roundTrip(text: string, { events }: Structure): string[] {
    try {
      const count = (this.options.countEvents ?? countWithIcalJs)(text);

      return count === events.length
        ? []
        : [`ical.js found ${count} events, expected ${events.length}`];
    } catch (error) {
      return [`ical.js could not parse the file: ${(error as Error).message}`];
    }
  }
}

export const icsValidator = new ICSValidator();
