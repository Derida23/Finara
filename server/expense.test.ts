import { describe, expect, it } from "vitest";
import {
  applyPatch,
  compareNewestFirst,
  createExpense,
  type Expense,
  fromExpenseRow,
  isMonth,
  toActiveCategories,
  toExpenseRow,
} from "./expense.js";

const NOW = new Date("2026-11-20T05:00:00.000Z");
const ID = "3f1c2a4e-8b7d-4c6a-9e5f-1a2b3c4d5e6f";
const OTHER_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const VALID_INPUT = {
  id: ID,
  date: "2026-11-20",
  amount: 25_000,
  category: "Makan & Minum",
  method: "Tunai",
  note: "Nasi padang",
};
const EXPENSE: Expense = {
  ...VALID_INPUT,
  createdAt: "2026-11-20T04:00:00.000Z",
  updatedAt: "2026-11-20T04:00:00.000Z",
};

describe("isMonth", () => {
  it("should reject a full date", () => {
    expect(isMonth("2026-11-20")).toBe(false);
  });

  it("should reject month 13", () => {
    expect(isMonth("2026-13")).toBe(false);
  });

  it("should accept YYYY-MM", () => {
    expect(isMonth("2026-11")).toBe(true);
  });
});

describe("createExpense", () => {
  it("should reject a body that is not an object", () => {
    expect(createExpense(null, NOW)).toEqual({ ok: false, field: "body" });
  });

  it("should default a missing note to an empty string", () => {
    const result = createExpense({ ...VALID_INPUT, note: undefined }, NOW);
    expect(result.ok && result.value.note).toBe("");
  });

  it("should trim category and note", () => {
    const result = createExpense({ ...VALID_INPUT, category: " Belanja ", note: " sabun " }, NOW);
    expect(result.ok && [result.value.category, result.value.note]).toEqual(["Belanja", "sabun"]);
  });

  it("should stamp both timestamps with the server time when the client sends none", () => {
    expect(createExpense(VALID_INPUT, NOW)).toEqual({
      ok: true,
      value: { ...VALID_INPUT, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
    });
  });

  it("should keep a past createdAt recorded while offline", () => {
    const result = createExpense({ ...VALID_INPUT, createdAt: "2026-11-19T23:00:00.000Z" }, NOW);
    expect(result.ok && result.value.createdAt).toBe("2026-11-19T23:00:00.000Z");
  });

  it("should reject a createdAt more than five minutes ahead of the server", () => {
    const result = createExpense({ ...VALID_INPUT, createdAt: "2026-11-20T05:06:00.000Z" }, NOW);
    expect(result).toEqual({ ok: false, field: "createdAt" });
  });

  it.each([
    [{ id: "abc" }, "id"],
    [{ date: "2026-02-30" }, "date"],
    [{ date: "20-11-2026" }, "date"],
    [{ amount: 0 }, "amount"],
    [{ amount: -5_000 }, "amount"],
    [{ amount: 2_500.5 }, "amount"],
    [{ amount: "25000" }, "amount"],
    [{ amount: 1_000_000_000_001 }, "amount"],
    [{ category: "   " }, "category"],
    [{ category: "x".repeat(51) }, "category"],
    [{ method: "Bitcoin" }, "method"],
    [{ note: 123 }, "note"],
    [{ note: "x".repeat(201) }, "note"],
  ])("should reject %o as an invalid %s", (override, field) => {
    expect(createExpense({ ...VALID_INPUT, ...override }, NOW)).toEqual({ ok: false, field });
  });
});

describe("applyPatch", () => {
  it("should reject a body that is not an object", () => {
    expect(applyPatch(EXPENSE, "amount=1", NOW)).toEqual({ ok: false, field: "body" });
  });

  it("should change only the fields sent and keep createdAt", () => {
    expect(applyPatch(EXPENSE, { amount: 30_000 }, NOW)).toEqual({
      ok: true,
      value: { ...EXPENSE, amount: 30_000, updatedAt: NOW.toISOString() },
    });
  });

  it("should ignore an attempt to change the id or timestamps", () => {
    const result = applyPatch(EXPENSE, { id: OTHER_ID, createdAt: NOW.toISOString() }, NOW);
    expect(result.ok && [result.value.id, result.value.createdAt]).toEqual([ID, EXPENSE.createdAt]);
  });

  it("should reject an invalid change", () => {
    expect(applyPatch(EXPENSE, { amount: 0 }, NOW)).toEqual({ ok: false, field: "amount" });
  });
});

describe("fromExpenseRow", () => {
  it("should return null for an empty row", () => {
    expect(fromExpenseRow([])).toBeNull();
  });

  it("should return null when the id is missing", () => {
    expect(fromExpenseRow(["", "2026-11-20", 25_000, "Belanja"])).toBeNull();
  });

  it("should read back a row written by toExpenseRow", () => {
    expect(fromExpenseRow(toExpenseRow(EXPENSE))).toEqual(EXPENSE);
  });

  it("should convert a date serial typed in Sheets to YYYY-MM-DD", () => {
    expect(fromExpenseRow([ID, 46_346, 25_000])?.date).toBe("2026-11-20");
  });

  it("should accept an amount stored as numeric text", () => {
    expect(fromExpenseRow([ID, "2026-11-20", "25000"])?.amount).toBe(25_000);
  });

  it("should keep a payment method typed by hand instead of hiding the row", () => {
    expect(fromExpenseRow([ID, "2026-11-20", 25_000, "Belanja", "GoPay"])?.method).toBe("GoPay");
  });
});

describe("compareNewestFirst", () => {
  it("should put later dates first, then later createdAt within the same day", () => {
    const expenses = [
      { ...EXPENSE, id: "a", date: "2026-11-19" },
      { ...EXPENSE, id: "b", createdAt: "2026-11-20T01:00:00.000Z" },
      { ...EXPENSE, id: "c", createdAt: "2026-11-20T03:00:00.000Z" },
    ];
    expect(expenses.sort(compareNewestFirst).map((expense) => expense.id)).toEqual(["c", "b", "a"]);
  });
});

describe("toActiveCategories", () => {
  it("should return an empty list for no rows", () => {
    expect(toActiveCategories([])).toEqual([]);
  });

  it("should skip rows without a name and rows unticked as inactive", () => {
    expect(
      toActiveCategories([
        ["", 1, 0, true],
        ["Hiburan", 2, 0, false],
      ]),
    ).toEqual([]);
  });

  it("should treat a blank aktif cell as active", () => {
    expect(toActiveCategories([["Hiburan", 1, 50_000]])).toEqual([
      { name: "Hiburan", order: 1, monthlyBudget: 50_000 },
    ]);
  });

  it("should sort by urutan and default a missing budget to 0", () => {
    const rows = [
      ["Tagihan", 2, 1_000_000, true],
      ["Makan & Minum", 1, "", true],
    ];
    expect(toActiveCategories(rows)).toEqual([
      { name: "Makan & Minum", order: 1, monthlyBudget: 0 },
      { name: "Tagihan", order: 2, monthlyBudget: 1_000_000 },
    ]);
  });
});
