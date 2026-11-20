import type { Category, Expense } from "../../shared/expense";

interface DayGroup {
  date: string;
  total: number;
  expenses: Expense[];
}

interface CategorySummary {
  name: string;
  spent: number;
  budget: number;
  share: number;
}

interface MonthSummary {
  total: number;
  count: number;
  budget: number;
  dailyAverage: number;
  categories: CategorySummary[];
}

const sumAmounts = (expenses: readonly Expense[]): number => {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
};

const byNewest = (a: Expense, b: Expense): number => {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
};

// Most-used categories first, so the usual one is a single tap away; ties keep the sheet order.
const rankCategories = (categories: readonly Category[], expenses: readonly Expense[]) => {
  const usage = new Map<string, number>();
  for (const expense of expenses) {
    usage.set(expense.category, (usage.get(expense.category) ?? 0) + 1);
  }
  return [...categories].sort((a, b) => {
    return (usage.get(b.name) ?? 0) - (usage.get(a.name) ?? 0) || a.order - b.order;
  });
};

const groupByDay = (expenses: readonly Expense[]): DayGroup[] => {
  const groups = new Map<string, Expense[]>();
  for (const expense of [...expenses].sort(byNewest)) {
    groups.set(expense.date, [...(groups.get(expense.date) ?? []), expense]);
  }
  return [...groups].map(([date, items]) => ({ date, total: sumAmounts(items), expenses: items }));
};

const daysInMonth = (month: string): number => {
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
};

// The running month averages over the days so far, not over the whole month.
const elapsedDays = (month: string, today: string): number => {
  const currentMonth = today.slice(0, 7);
  if (month > currentMonth) {
    return 0;
  }
  return month === currentMonth ? Number(today.slice(8, 10)) : daysInMonth(month);
};

const summarizeMonth = (
  expenses: readonly Expense[],
  categories: readonly Category[],
  month: string,
  today: string,
): MonthSummary => {
  const total = sumAmounts(expenses);
  const spentByCategory = new Map<string, number>();
  for (const expense of expenses) {
    spentByCategory.set(
      expense.category,
      (spentByCategory.get(expense.category) ?? 0) + expense.amount,
    );
  }
  const knownNames = new Set(categories.map((category) => category.name));
  const rows = [
    ...categories.map((category) => {
      return {
        name: category.name,
        spent: spentByCategory.get(category.name) ?? 0,
        budget: category.monthlyBudget,
      };
    }),
    // Spending under a category that was renamed or switched off in the sheet still counts.
    ...[...spentByCategory]
      .filter(([name]) => !knownNames.has(name))
      .map(([name, spent]) => ({ name, spent, budget: 0 })),
  ];
  const days = elapsedDays(month, today);
  return {
    total,
    count: expenses.length,
    budget: categories.reduce((sum, category) => sum + category.monthlyBudget, 0),
    dailyAverage: days === 0 ? 0 : Math.round(total / days),
    categories: rows
      .filter((row) => row.spent > 0 || row.budget > 0)
      .map((row) => ({ ...row, share: total === 0 ? 0 : row.spent / total }))
      .sort((a, b) => b.spent - a.spent || b.budget - a.budget),
  };
};

export type { CategorySummary, DayGroup, MonthSummary };
export { byNewest, groupByDay, rankCategories, sumAmounts, summarizeMonth };
