export type Nullable<T> = T | null;

// eslint-disable-next-line sonarjs/redundant-type-aliases -- named so the code says whether a string is a date or a date and time
export type LocalDateTime = string;

// eslint-disable-next-line sonarjs/redundant-type-aliases -- named so the code says whether a string is a date or a date and time
export type DateOnly = string;

export type EventTime =
  | { allDay: false; start: LocalDateTime; end: LocalDateTime }
  | { allDay: true; start: DateOnly; end: DateOnly };
