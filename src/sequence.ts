import { addDays } from '@ics/dates';
import type {
  Identity,
  IsShrunkOptions,
  SequenceCounts,
  SequenceOptions,
} from '@ics/sequence.types';
import { compareStrings } from '@ics/text';
import type { DateOnly } from '@ics/types';
export type {
  Identity,
  SequenceCounts,
  SequenceOptions,
  SequenceState,
  ShrinkOptions,
} from '@ics/sequence.types';

export const isShrunk = ({ previous, current, options }: IsShrunkOptions) =>
  previous >= options.massDisappearanceMinEvents &&
  current < previous * options.massDisappearanceRatio;

const latestSeen = (identities: Readonly<Record<string, Identity>>) =>
  Object.values(identities)
    .map((identity) => identity.lastSeen)
    .toSorted(compareStrings)
    .at(-1) ?? '';

interface NextIdentityOptions {
  before: Identity | undefined;
  hash: string;
  nowIso: string;
  runDate: DateOnly;
}

const nextIdentity = ({
  before,
  hash,
  nowIso,
  runDate,
}: NextIdentityOptions): { identity: Identity; changed: boolean } => {
  if (!before) {
    return {
      identity: { hash, sequence: 0, lastModified: nowIso, lastSeen: runDate },
      changed: false,
    };
  }

  const isChanged = before.hash !== hash;

  return {
    changed: isChanged,
    identity: {
      ...before,
      ...(isChanged && {
        hash,
        sequence: before.sequence + 1,
        lastModified: nowIso,
      }),
      lastSeen: runDate,
    },
  };
};

export const trackSequences = <T>({
  identities,
  items,
  options,
}: {
  identities: Readonly<Record<string, Identity>>;
  items: Map<string, T>;
  options: SequenceOptions<T>;
}) => {
  const { runDate, nowIso, keepIdentityDays, hash } = options;
  const lastRun = latestSeen(identities);
  const tracked = [...items].map(([uid, item]) => {
    const before = identities[uid];
    const { identity, changed } = nextIdentity({
      before,
      hash: hash(item),
      nowIso,
      runDate,
    });

    return { uid, item, identity, added: !before, changed };
  });
  const counts: SequenceCounts = {
    added: tracked.filter(({ added }) => added).length,
    updated: tracked.filter(({ changed }) => changed).length,
    removed: Object.entries(identities).filter(
      ([uid, identity]) => !items.has(uid) && identity.lastSeen === lastRun,
    ).length,
  };
  const forgetBefore = addDays(runDate, -keepIdentityDays);
  const merged = {
    ...identities,
    ...Object.fromEntries(tracked.map(({ uid, identity }) => [uid, identity])),
  };

  return {
    entries: tracked.map(({ uid, item, identity }) => ({
      uid,
      item,
      sequence: identity.sequence,
      lastModified: identity.lastModified,
    })),
    counts,
    identities: Object.fromEntries(
      Object.entries(merged).filter(
        ([, identity]) => identity.lastSeen >= forgetBefore,
      ),
    ),
  };
};
