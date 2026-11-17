import { describe, expect, it } from 'vitest';

import { dropDuplicates, type DuplicateSubject } from '@ics/duplicates';

interface Item {
  id: string;
  subject: DuplicateSubject;
}

const item = (id: string, over: Partial<DuplicateSubject> = {}): Item => ({
  id,
  subject: {
    id,
    title: 'Życie to krótki sen. Biografia Soyki - premiera książki',
    text: 'krótki',
    place: 'Hall Orchard, Elm Street 9',
    starts: ['2026-10-29T19:00:00'],
    ...over,
  },
});

const run = (items: Item[]) =>
  dropDuplicates({
    records: items,
    subjectOf: (entry) => entry.subject,
    options: {
      titlePrefix: 28,
      minTitle: 12,
    },
  });

describe('dropDuplicates', () => {
  it('keeps one of two records with the same starts, venue and title start, the longer text', () => {
    const short = item('a', {
      title:
        'Życie to krótki sen. Biografia Soyki - premiera książki i spotkanie',
    });
    const long = item('b', { text: 'a much longer description' });
    const result = run([short, long]);

    expect(result.kept.map((entry) => entry.id)).toEqual(['b']);
    expect(result.dropped).toEqual([{ record: short, keptInstead: long }]);
    const reverse = run([long, short]);

    expect(reverse.kept.map((entry) => entry.id)).toEqual(['b']);
    expect(reverse.dropped).toEqual([{ record: short, keptInstead: long }]);
  });

  it('replaces the shorter twin in a venue that holds other records too', () => {
    const other = item('x', {
      title: 'Zupełnie inne wydarzenie w tym samym miejscu',
    });
    const short = item('a');
    const long = item('b', { text: 'a much longer description' });
    const result = run([other, short, long]);

    expect(result.kept.map((entry) => entry.id)).toEqual(['x', 'b']);
    expect(result.dropped).toEqual([{ record: short, keptInstead: long }]);
  });

  it('compares the venue name only, without case, diacritics or the street', () => {
    const result = run([
      item('a'),
      item('b', { place: 'HALL ORCHARD, Elm Street 9, 10115 Springfield' }),
    ]);

    expect(result.kept).toHaveLength(1);
  });

  it('treats a title that is the start of the other as the same', () => {
    const result = run([
      item('a', { title: 'Spring Concert' }),
      item('b', { title: 'Spring Concert w parku' }),
    ]);

    expect(result.kept).toHaveLength(1);
  });

  it('keeps records that differ in a start, the venue or the title', () => {
    const base = item('a');
    const kept = run([
      base,
      item('b', { starts: ['2026-10-30T19:00:00'] }),
      item('c', { place: 'Teatr Studio' }),
      item('d', { title: 'Zupełnie inne wydarzenie w tym samym miejscu' }),
    ]);

    expect(kept.kept).toHaveLength(4);
  });

  it('does not call a record with the same id a duplicate', () => {
    const result = run([item('a'), item('b', { id: 'a' })]);

    expect(result.kept).toHaveLength(2);
  });

  it('never calls a record without a venue, or with a very short title, a duplicate', () => {
    const result = run([
      item('a', { place: '' }),
      item('b', { place: '' }),
      item('c', { title: 'Bal' }),
      item('d', { title: 'Bal' }),
    ]);

    expect(result.kept).toHaveLength(4);
    expect(result.dropped).toEqual([]);
  });
});
