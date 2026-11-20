import { describe, expect, it } from "vitest";
import {
  appendAmountKey,
  dateLabel,
  dayHeading,
  formatRupiah,
  monthLabel,
  removeAmountDigit,
  shiftDays,
  shiftMonth,
  toLocalDate,
} from "./format";

describe("formatRupiah", () => {
  it("should format zero", () => {
    expect(formatRupiah(0)).toBe("Rp0");
  });

  it("should group thousands with dots", () => {
    expect(formatRupiah(1_250_000)).toBe("Rp1.250.000");
  });
});

describe("appendAmountKey", () => {
  it("should stay at zero when zeros are pressed first", () => {
    expect(appendAmountKey(appendAmountKey(0, "0"), "000")).toBe(0);
  });

  it("should start the amount with the first digit", () => {
    expect(appendAmountKey(0, "5")).toBe(5);
  });

  it("should append 000 as three zeros", () => {
    expect(appendAmountKey(25, "000")).toBe(25_000);
  });

  it("should ignore keys past 12 digits", () => {
    expect(appendAmountKey(999_999_999_999, "9")).toBe(999_999_999_999);
  });
});

describe("removeAmountDigit", () => {
  it("should drop the last digit", () => {
    expect(removeAmountDigit(25_000)).toBe(2_500);
  });

  it("should reach zero from a single digit", () => {
    expect(removeAmountDigit(5)).toBe(0);
  });
});

describe("toLocalDate", () => {
  it("should pad month and day", () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("shiftDays", () => {
  it("should cross a month boundary", () => {
    expect(shiftDays("2026-12-01", -1)).toBe("2026-11-30");
  });

  it("should cross a year boundary", () => {
    expect(shiftDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("dateLabel", () => {
  it("should name today", () => {
    expect(dateLabel("2026-11-20", "2026-11-20")).toBe("Hari ini");
  });

  it("should name yesterday", () => {
    expect(dateLabel("2026-11-19", "2026-11-20")).toBe("Kemarin");
  });

  it("should show day and short month for older dates", () => {
    expect(dateLabel("2026-11-02", "2026-11-20")).toBe("2 Nov");
  });
});

describe("dayHeading", () => {
  it("should keep Hari ini and Kemarin for the two most recent days", () => {
    expect(dayHeading("2026-11-19", "2026-11-20")).toBe("Kemarin");
  });

  it("should spell out the weekday for older dates", () => {
    expect(dayHeading("2026-11-16", "2026-11-20")).toBe("Senin, 16 Nov");
  });
});

describe("monthLabel", () => {
  it("should spell out the month and year", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
  });
});

describe("shiftMonth", () => {
  it("should go back across a year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("should go forward from the 31st-day month without skipping one", () => {
    expect(shiftMonth("2026-01", 1)).toBe("2026-02");
  });
});
