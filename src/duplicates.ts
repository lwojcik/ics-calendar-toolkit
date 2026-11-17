import { foldText } from '@ics/text';

export interface DuplicateSubject {
  id: string;
  title: string;
  text: string;
  place: string;
  starts: string[];
}

export interface DuplicateOptions {
  titlePrefix: number;
  minTitle: number;
}

export interface DuplicateResult<T> {
  kept: T[];
  dropped: { record: T; keptInstead: T }[];
}

const words = (text: string) =>
  foldText(text)
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

interface Entry<T> {
  record: T;
  id: string;
  text: number;
  title: string;
}

interface Pass<T> {
  groups: Record<string, Entry<T>[]>;
  dropped: DuplicateResult<T>['dropped'];
  gone: T[];
}

interface CompareOptions<T> {
  found: Pass<T>;
  record: T;
  subjectOf: (record: T) => DuplicateSubject;
  options: DuplicateOptions;
}

const compare = <T>({
  found,
  record,
  subjectOf,
  options,
}: CompareOptions<T>): Pass<T> => {
  const head = (value: string) => value.slice(0, options.titlePrefix);
  const subject = subjectOf(record);
  const venue = words(subject.place.split(',', 1)[0]);
  const title = words(subject.title);

  if (!venue || title.length < options.minTitle) {
    return found;
  }

  const key = `${subject.starts.join('|')}#${venue}`;
  const group = found.groups[key] ?? [];
  const twin = group.find(
    (other) =>
      other.id !== subject.id &&
      (head(other.title) === head(title) ||
        other.title.startsWith(title) ||
        title.startsWith(other.title)),
  );
  const entry = { record, id: subject.id, text: subject.text.length, title };

  if (!twin) {
    return {
      ...found,
      groups: { ...found.groups, [key]: [...group, entry] },
    };
  }

  if (entry.text > twin.text) {
    return {
      groups: {
        ...found.groups,
        [key]: group.map((other) => (other === twin ? entry : other)),
      },
      dropped: [...found.dropped, { record: twin.record, keptInstead: record }],
      gone: [...found.gone, twin.record],
    };
  }

  return {
    ...found,
    dropped: [...found.dropped, { record, keptInstead: twin.record }],
    gone: [...found.gone, record],
  };
};

export const dropDuplicates = <T>({
  records,
  subjectOf,
  options,
}: {
  records: T[];
  subjectOf: (record: T) => DuplicateSubject;
  options: DuplicateOptions;
}): DuplicateResult<T> => {
  // eslint-disable-next-line no-restricted-syntax -- carried from one record to the next
  let pass: Pass<T> = { groups: {}, dropped: [], gone: [] };

  // eslint-disable-next-line no-restricted-syntax -- each record is compared with the ones kept before it
  for (const record of records) {
    pass = compare({ found: pass, record, subjectOf, options });
  }

  const gone = new Set(pass.gone);

  return {
    kept: records.filter((record) => !gone.has(record)),
    dropped: pass.dropped,
  };
};
