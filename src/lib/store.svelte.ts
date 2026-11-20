import type { Category, Expense } from "../../shared/expense";
import { ApiError, listCategories, listExpenses } from "./api";
import { byNewest } from "./summary";

type LoadStatus = "loading" | "ready" | "error";

interface MonthData {
  status: LoadStatus;
  expenses: Expense[];
}

interface StoreState {
  categories: Category[];
  categoriesStatus: LoadStatus;
  months: Record<string, MonthData>;
}

// A local change made while a month was being fetched; `expense: null` marks a delete.
interface LocalChange {
  at: number;
  expense: Expense | null;
}

const PENDING_MONTH: MonthData = { status: "loading", expenses: [] };

// One cache for all tabs, so a save in Catat shows up in Riwayat and Ringkasan right away.
const data = $state<StoreState>({ categories: [], categoriesStatus: "loading", months: {} });
const localChanges = new Map<string, LocalChange>();

const monthOf = (expense: Expense): string => expense.date.slice(0, 7);

const isUnauthorized = (error: unknown): boolean => {
  return error instanceof ApiError && error.status === 401;
};

// A fetch that started before a local save/edit/delete must not undo it on screen.
const mergeLocalChanges = (month: string, fetched: Expense[], startedAt: number): Expense[] => {
  let merged = fetched;
  for (const [id, change] of localChanges) {
    if (change.at < startedAt) {
      continue;
    }
    merged = merged.filter((expense) => expense.id !== id);
    if (change.expense && monthOf(change.expense) === month) {
      merged = [...merged, change.expense];
    }
  }
  return merged.sort(byNewest);
};

const refreshCategories = async (): Promise<void> => {
  const hadData = data.categoriesStatus === "ready";
  if (!hadData) {
    data.categoriesStatus = "loading";
  }
  try {
    data.categories = await listCategories();
    data.categoriesStatus = "ready";
  } catch (error) {
    if (!hadData && !isUnauthorized(error)) {
      data.categoriesStatus = "error";
    }
  }
};

// Shows cached data at once and refreshes it in the background.
const refreshMonth = async (month: string): Promise<void> => {
  const hadData = data.months[month]?.status === "ready";
  if (!hadData) {
    data.months[month] = { status: "loading", expenses: [] };
  }
  const startedAt = Date.now();
  try {
    const fetched = await listExpenses(month);
    data.months[month] = {
      status: "ready",
      expenses: mergeLocalChanges(month, fetched, startedAt),
    };
  } catch (error) {
    if (!hadData && !isUnauthorized(error)) {
      data.months[month] = { status: "error", expenses: [] };
    }
  }
};

const upsert = (expense: Expense): void => {
  localChanges.set(expense.id, { at: Date.now(), expense });
  const bucket = data.months[monthOf(expense)];
  if (bucket?.status === "ready") {
    const others = bucket.expenses.filter((item) => item.id !== expense.id);
    bucket.expenses = [expense, ...others].sort(byNewest);
  }
};

const remove = (expense: Expense): void => {
  localChanges.set(expense.id, { at: Date.now(), expense: null });
  const bucket = data.months[monthOf(expense)];
  if (bucket) {
    bucket.expenses = bucket.expenses.filter((item) => item.id !== expense.id);
  }
};

// An edit may move the expense to another month.
const replace = (before: Expense, after: Expense): void => {
  remove(before);
  upsert(after);
};

const store = {
  get categories(): Category[] {
    return data.categories;
  },
  get categoriesStatus(): LoadStatus {
    return data.categoriesStatus;
  },
  month: (month: string): MonthData => data.months[month] ?? PENDING_MONTH,
  refreshCategories,
  refreshMonth,
  upsert,
  remove,
  replace,
};

export type { LoadStatus, MonthData };
export { store };
