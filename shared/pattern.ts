// Android-style 3×3 unlock pattern, shared by the lock screen, the API and `pnpm set-pattern` so a
// pattern set in the terminal is exactly the one drawn in the app. Dots are numbered like a phone
// keypad:
//   1 2 3
//   4 5 6
//   7 8 9

const GRID_SIZE = 3;
const MIN_PATTERN_DOTS = 4;
const DOT_DIGITS = /^[1-9]+$/;
const SEPARATORS = /[\s,.-]+/g;

interface Cell {
  row: number;
  col: number;
}

const cellOf = (dot: number): Cell => {
  return { row: Math.floor((dot - 1) / GRID_SIZE), col: (dot - 1) % GRID_SIZE };
};

// The dot exactly halfway between two dots on one row, column or diagonal (1 and 3 → 2).
const middleDot = (from: number, to: number): number | null => {
  const a = cellOf(from);
  const b = cellOf(to);
  if ((a.row + b.row) % 2 !== 0 || (a.col + b.col) % 2 !== 0) {
    return null;
  }
  const middle = ((a.row + b.row) / 2) * GRID_SIZE + (a.col + b.col) / 2 + 1;
  return middle === from || middle === to ? null : middle;
};

// Adds a dot the way Android does: each dot is used once, and jumping over an unused dot connects
// it on the way. A knight's move (1 → 8) has no middle dot, so nothing is added in between.
const addDot = (pattern: readonly number[], dot: number): number[] => {
  if (pattern.includes(dot)) {
    return [...pattern];
  }
  const last = pattern.at(-1);
  const middle = last === undefined ? null : middleDot(last, dot);
  const passed = middle !== null && !pattern.includes(middle) ? [middle] : [];
  return [...pattern, ...passed, dot];
};

const connectDots = (dots: readonly number[]): number[] => {
  return dots.reduce<number[]>((pattern, dot) => addDot(pattern, dot), []);
};

// Reads "1-2-5-8-9", "1 2 5 8 9" or "12589"; null when anything other than dots 1–9 is typed.
const parseDots = (text: string): number[] | null => {
  const digits = text.replace(SEPARATORS, "");
  return DOT_DIGITS.test(digits) ? [...digits].map(Number) : null;
};

const isCompletePattern = (dots: readonly number[]): boolean => {
  return dots.length >= MIN_PATTERN_DOTS && new Set(dots).size === dots.length;
};

// The form that is hashed and sent to the API: the dots in drawing order, e.g. "12589".
const toPatternString = (dots: readonly number[]): string => dots.join("");

const isPatternString = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    DOT_DIGITS.test(value) &&
    value.length >= MIN_PATTERN_DOTS &&
    new Set(value).size === value.length
  );
};

export {
  addDot,
  connectDots,
  GRID_SIZE,
  isCompletePattern,
  isPatternString,
  MIN_PATTERN_DOTS,
  parseDots,
  toPatternString,
};
