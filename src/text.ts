/* eslint-disable security/detect-unsafe-regex -- the character classes are fixed and the text is bounded */

export const compareStrings = (first: string, second: string) =>
  Number(first > second) - Number(first < second);

const LETTER_FOLDS = new Map([
  ['ß', 'ss'],
  ['æ', 'ae'],
  ['œ', 'oe'],
  ['ø', 'o'],
  ['đ', 'd'],
  ['ð', 'd'],
  ['þ', 'th'],
  ['ħ', 'h'],
  ['ł', 'l'],
]);

export const foldText = (text: string): string =>
  text
    .normalize('NFD')
    .replaceAll(/[\u{300}-\u{36F}]/gu, '')
    .toLowerCase()
    .replaceAll(/[ßæðøþđħłœ]/g, (letter) => LETTER_FOLDS.get(letter) ?? letter);

export const truncate = (text: string, maxLength: number): string => {
  const chars = [...text];

  return chars.length <= maxLength
    ? text
    : `${chars.slice(0, maxLength - 1).join('')}…`;
};
