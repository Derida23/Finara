import { describe, expect, it } from "vitest";
import type { Category, Expense } from "../../shared/expense";
import { byNewest, groupByDay, rankCategories, sumAmounts, summarizeMonth } from "./summary";

const expense = (overrides: Partial<Expense>): Expense => {
  return {
    id: "id",
    date: "2026-11-20",
    amount: 10_000,
    category: "Belanja",
    method: "Tunai",
    note: "",
    createdAt: "2026-11-20T01:00:00.000Z",
    updatedAt: "2026-11-20T01:00:00.000Z",
    ...overrides,
  };
};

const CATEGORIES: Category[] = [
  { name: "Makan & Minum", order: 1, monthlyBudget: 1_000_000 },
  { name: "Transportasi", order: 2, monthlyBudget: 0 },
  { name: "Belanja", order: 3, monthlyBudget: 500_000 },
];

describe("sumAmounts", () => {
  it("should return zero for no expenses", () => {
    expect(sumAmounts([])).toBe(0);
  });

  it("should add every amount", () => {
    expect(sumAmounts([expense({ amount: 25_000 }), expense({ amount: 12_000 })])).toBe(37_000);
  });
});

describe("byNewest", () => {
  it("should order by date, then by createdAt within the same date", () => {
    const list = [
      expense({ id: "old-day", date: "2026-11-19" }),
      expense({ id: "early", createdAt: "2026-11-20T01:00:00.000Z" }),
      expense({ id: "late", createdAt: "2026-11-20T09:00:00.000Z" }),
    ];
    expect(list.sort(byNewest).map((item) => item.id)).toEqual(["late", "early", "old-day"]);
  });
});

describe("rankCategories", () => {
  it("should keep the sheet order when nothing has been spent", () => {
    expect(rankCategories(CATEGORIES, []).map((category) => category.name)).toEqual([
      "Makan & Minum",
      "Transportasi",
      "Belanja",
    ]);
  });

  it("should put the most-used category first", () => {
    const expenses = [expense({ category: "Belanja" }), expense({ category: "Belanja" })];
    expect(rankCategories(CATEGORIES, expenses)[0]?.name).toBe("Belanja");
  });
});

describe("groupByDay", () => {
  it("should return no groups for no expenses", () => {
    expect(groupByDay([])).toEqual([]);
  });

  it("should group per date, newest date first, with a total per day", () => {
    const groups = groupByDay([
      expense({ id: "a", date: "2026-11-19", amount: 5_000 }),
      expense({ id: "b", date: "2026-11-20", amount: 7_000 }),
      expense({ id: "c", date: "2026-11-19", amount: 3_000 }),
    ]);
    expect(groups.map((group) => [group.date, group.total, group.expenses.length])).toEqual([
      ["2026-11-20", 7_000, 1],
      ["2026-11-19", 8_000, 2],
    ]);
  });
});

describe("summarizeMonth", () => {
  it("should report zeros for an empty month but keep budgeted categories", () => {
    const summary = summarizeMonth([], CATEGORIES, "2026-11", "2026-11-20");
    expect(summary).toEqual({
      total: 0,
      count: 0,
      budget: 1_500_000,
      dailyAverage: 0,
      categories: [
        { name: "Makan & Minum", spent: 0, budget: 1_000_000, share: 0 },
        { name: "Belanja", spent: 0, budget: 500_000, share: 0 },
      ],
    });
  });

  it("should average the running month over the days so far", () => {
    const summary = summarizeMonth(
      [expense({ amount: 200_000 })],
      CATEGORIES,
      "2026-11",
      "2026-11-20",
    );
    expect(summary.dailyAverage).toBe(10_000);
  });

  it("should average a past month over all of its days", () => {
    const summary = summarizeMonth(
      [expense({ amount: 310_000 })],
      CATEGORIES,
      "2026-10",
      "2026-11-20",
    );
    expect(summary.dailyAverage).toBe(10_000);
  });

  it("should sort categories by spending and compute each share of the total", () => {
    const summary = summarizeMonth(
      [
        expense({ category: "Transportasi", amount: 30_000 }),
        expense({ category: "Makan & Minum", amount: 90_000 }),
      ],
      CATEGORIES,
      "2026-11",
      "2026-11-20",
    );
    expect(summary.categories.map((row) => [row.name, row.spent, row.share])).toEqual([
      ["Makan & Minum", 90_000, 0.75],
      ["Transportasi", 30_000, 0.25],
      ["Belanja", 0, 0],
    ]);
  });

  it("should still count spending under a category that is no longer in the sheet", () => {
    const summary = summarizeMonth(
      [expense({ category: "Kopi", amount: 18_000 })],
      CATEGORIES,
      "2026-11",
      "2026-11-20",
    );
    expect(summary.categories[0]).toEqual({ name: "Kopi", spent: 18_000, budget: 0, share: 1 });
  });
});
