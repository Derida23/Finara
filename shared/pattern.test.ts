import { describe, expect, it } from "vitest";
import {
  addDot,
  connectDots,
  isCompletePattern,
  isPatternString,
  parseDots,
  toPatternString,
} from "./pattern.js";

describe("addDot", () => {
  it("should start a pattern with the first dot", () => {
    expect(addDot([], 5)).toEqual([5]);
  });

  it("should ignore a dot that is already used", () => {
    expect(addDot([1, 2], 1)).toEqual([1, 2]);
  });

  it("should connect a neighbouring dot directly", () => {
    expect(addDot([1], 2)).toEqual([1, 2]);
  });

  it.each([
    [1, 3, 2],
    [1, 7, 4],
    [1, 9, 5],
    [3, 7, 5],
    [2, 8, 5],
    [4, 6, 5],
    [7, 9, 8],
    [3, 9, 6],
  ])("should pass through the unused middle dot from %i to %i (%i)", (from, to, middle) => {
    expect(addDot([from], to)).toEqual([from, middle, to]);
  });

  it("should not repeat a middle dot that is already used", () => {
    expect(addDot([2, 1], 3)).toEqual([2, 1, 3]);
  });

  it("should not add anything for a knight's move", () => {
    expect(addDot([1], 8)).toEqual([1, 8]);
  });
});

describe("connectDots", () => {
  it("should return an empty pattern for no dots", () => {
    expect(connectDots([])).toEqual([]);
  });

  it("should fill in every jumped dot along the way", () => {
    expect(connectDots([1, 3, 9, 7])).toEqual([1, 2, 3, 6, 9, 8, 7]);
  });

  it("should drop repeated dots", () => {
    expect(connectDots([1, 2, 1, 5])).toEqual([1, 2, 5]);
  });
});

describe("parseDots", () => {
  it("should read dots separated by dashes", () => {
    expect(parseDots("1-2-5-8-9")).toEqual([1, 2, 5, 8, 9]);
  });

  it("should read dots separated by spaces or written together", () => {
    expect([parseDots("1 2 5 8 9"), parseDots("12589")]).toEqual([
      [1, 2, 5, 8, 9],
      [1, 2, 5, 8, 9],
    ]);
  });

  it("should reject an empty input", () => {
    expect(parseDots("  ")).toBeNull();
  });

  it("should reject a 0 or any non-dot character", () => {
    expect([parseDots("1-0-5"), parseDots("1-a-5")]).toEqual([null, null]);
  });
});

describe("isCompletePattern", () => {
  it("should reject fewer than 4 dots", () => {
    expect(isCompletePattern([1, 2, 3])).toBe(false);
  });

  it("should accept 4 different dots", () => {
    expect(isCompletePattern([1, 2, 3, 6])).toBe(true);
  });

  it("should reject a repeated dot", () => {
    expect(isCompletePattern([1, 2, 1, 3])).toBe(false);
  });
});

describe("toPatternString", () => {
  it("should join the dots in drawing order", () => {
    expect(toPatternString([7, 5, 3, 6])).toBe("7536");
  });
});

describe("isPatternString", () => {
  it("should reject a non-string value", () => {
    expect(isPatternString(12589)).toBe(false);
  });

  it("should reject fewer than 4 dots", () => {
    expect(isPatternString("125")).toBe(false);
  });

  it("should reject a repeated dot", () => {
    expect(isPatternString("12512")).toBe(false);
  });

  it("should reject a 0", () => {
    expect(isPatternString("10258")).toBe(false);
  });

  it("should accept all nine dots", () => {
    expect(isPatternString("123654789")).toBe(true);
  });
});
