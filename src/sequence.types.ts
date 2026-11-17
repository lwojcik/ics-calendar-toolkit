import type { DateOnly, Nullable } from '@ics/types';

export interface Identity {
  hash: Nullable<string>;
  sequence: number;
  lastModified: string;
  lastSeen: DateOnly;
}

export interface SequenceState {
  lastEventCount: number;
  identities: Record<string, Identity>;
}

export interface ShrinkOptions {
  massDisappearanceRatio: number;
  massDisappearanceMinEvents: number;
}

export interface IsShrunkOptions {
  previous: number;
  current: number;
  options: ShrinkOptions;
}

export interface SequenceOptions<T> {
  runDate: DateOnly;
  nowIso: string;
  keepIdentityDays: number;
  hash: (item: T) => string;
}

export interface SequenceCounts {
  added: number;
  updated: number;
  removed: number;
}
