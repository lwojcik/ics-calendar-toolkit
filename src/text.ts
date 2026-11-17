/* eslint-disable security/detect-unsafe-regex -- the character classes are fixed and the text is bounded */

export const compareStrings = (first: string, second: string) =>
  Number(first > second) - Number(first < second);

export const foldText = (text: string): string =>
  text
    .normalize('NFD')
    .replaceAll(/[\u{300}-\u{36F}]/gu, '')
    .replaceAll(/[Łł]/g, 'l')
    .toLowerCase();

export const truncate = (text: string, maxLength: number): string => {
  const chars = [...text];

  return chars.length <= maxLength
    ? text
    : `${chars.slice(0, maxLength - 1).join('')}…`;
};
