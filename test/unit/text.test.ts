import { describe, expect, it } from 'vitest';

import { compareStrings, foldText, truncate } from '@ics/text';

describe('text', () => {
  it('compares strings as -1, 0 or 1', () => {
    expect(['b', 'a', 'c'].toSorted(compareStrings)).toEqual(['a', 'b', 'c']);
    expect(compareStrings('a', 'a')).toBe(0);
  });

  it('folds case and diacritics, including the barred l', () => {
    expect(foldText('Łódź ŻÓŁW Crème')).toBe('lodz zolw creme');
  });

  it('truncates by characters, not bytes', () => {
    expect(truncate('żółw', 10)).toBe('żółw');
    expect(truncate('żółwik', 4)).toBe('żół…');
  });
});
