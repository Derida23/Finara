import {
  type Category,
  type Expense,
  type ExpenseFields,
  MAX_AMOUNT,
  MAX_CATEGORY_LENGTH,
  MAX_NOTE_LENGTH,
  PaymentMethod,
} from "../shared/expense.js";
import { isRecord } from "./http.js";

const EXPENSE_HEADERS = [
  "id",
  "tanggal",
  "nominal",
  "kategori",
  "metode",
  "catatan",
  "dibuat_pada",
  "diubah_pada",
];
const CATEGORY_HEADERS = ["nama", "urutan", "budget_bulanan", "aktif"];
const EDITABLE_FIELDS = ["date", "amount", "category", "method", "note"] as const;
const PAYMENT_METHODS: readonly string[] = Object.values(PaymentMethod);

const CLOCK_SKEW_MS = 5 * 60 * 1000;
const DAY_MS = 86_400_000;
// Day zero of Google Sheets date serial numbers.
const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type Result<T> = { ok: true; value: T } | { ok: false; field: string };

const fail = (field: string): { ok: false; field: string } => ({ ok: false, field });

const isExpenseId = (value: unknown): value is string => {
  return typeof value === "string" && UUID_PATTERN.test(value);
};

const isMonth = (value: unknown): value is string => {
  return typeof value === "string" && MONTH_PATTERN.test(value);
};

const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
};

const isAmount = (value: unknown): value is number => {
  return Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= MAX_AMOUNT;
};

const isPaymentMethod = (value: unknown): value is PaymentMethod => {
  return typeof value === "string" && PAYMENT_METHODS.includes(value);
};

const readNote = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return "";
  }
  return typeof value === "string" ? value.trim() : null;
};

const readCreatedAt = (value: unknown, now: Date): string | null => {
  if (value === undefined) {
    return now.toISOString();
  }
  const parsed = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
  const isValid =
    !Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime() + CLOCK_SKEW_MS;
  return isValid ? parsed.toISOString() : null;
};

const validateFields = (input: Record<string, unknown>): Result<ExpenseFields> => {
  const { id, date, amount, method } = input;
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const note = readNote(input.note);
  if (!isExpenseId(id)) {
    return fail("id");
  }
  if (!isCalendarDate(date)) {
    return fail("date");
  }
  if (!isAmount(amount)) {
    return fail("amount");
  }
  if (category.length === 0 || category.length > MAX_CATEGORY_LENGTH) {
    return fail("category");
  }
  if (!isPaymentMethod(method)) {
    return fail("method");
  }
  if (note === null || note.length > MAX_NOTE_LENGTH) {
    return fail("note");
  }
  return { ok: true, value: { id, date, amount, category, method, note } };
};

const createExpense = (body: unknown, now: Date): Result<Expense> => {
  if (!isRecord(body)) {
    return fail("body");
  }
  const fields = validateFields(body);
  if (!fields.ok) {
    return fields;
  }
  // Offline entries reach the server late; keep the time they were recorded on the phone.
  const createdAt = readCreatedAt(body.createdAt, now);
  if (createdAt === null) {
    return fail("createdAt");
  }
  return { ok: true, value: { ...fields.value, createdAt, updatedAt: now.toISOString() } };
};

const applyPatch = (existing: Expense, body: unknown, now: Date): Result<Expense> => {
  if (!isRecord(body)) {
    return fail("body");
  }
  const changes = EDITABLE_FIELDS.filter((field) => field in body).map((field) => {
    return [field, body[field]];
  });
  const fields = validateFields({ ...existing, ...Object.fromEntries(changes), id: existing.id });
  if (!fields.ok) {
    return fields;
  }
  return {
    ok: true,
    value: { ...fields.value, createdAt: existing.createdAt, updatedAt: now.toISOString() },
  };
};

const serialToIsoDate = (serial: number): string => {
  return new Date(SHEETS_EPOCH_MS + Math.floor(serial) * DAY_MS).toISOString().slice(0, 10);
};

const toText = (value: unknown): string => {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
};

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
};

const toExpenseRow = (expense: Expense): (string | number)[] => {
  return [
    expense.id,
    expense.date,
    expense.amount,
    expense.category,
    expense.method,
    expense.note,
    expense.createdAt,
    expense.updatedAt,
  ];
};

// Rows edited by hand in Google Sheets may hold date serials or numeric text; accept both.
const fromExpenseRow = (row: readonly unknown[]): Expense | null => {
  const [id, date, amount, category, method, note, createdAt, updatedAt] = row;
  const normalizedDate = typeof date === "number" ? serialToIsoDate(date) : date;
  const normalizedAmount = toNumber(amount, Number.NaN);
  if (!isExpenseId(id) || !isCalendarDate(normalizedDate) || !isAmount(normalizedAmount)) {
    return null;
  }
  return {
    id,
    date: normalizedDate,
    amount: normalizedAmount,
    category: toText(category),
    method: toText(method),
    note: toText(note),
    createdAt: toText(createdAt),
    updatedAt: toText(updatedAt),
  };
};

const compareNewestFirst = (a: Expense, b: Expense): number => {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
};

// A blank `aktif` cell counts as active, so a category typed in by hand shows up right away.
const toActiveCategories = (rows: readonly (readonly unknown[])[]): Category[] => {
  return rows
    .flatMap(([name, order, budget, active]) => {
      const trimmed = toText(name);
      if (trimmed === "" || active === false || active === "FALSE") {
        return [];
      }
      const category = {
        name: trimmed,
        order: toNumber(order, Number.MAX_SAFE_INTEGER),
        monthlyBudget: toNumber(budget, 0),
      };
      return [category];
    })
    .sort((a, b) => a.order - b.order);
};

export type { Category, Expense, Result };
export {
  applyPatch,
  CATEGORY_HEADERS,
  compareNewestFirst,
  createExpense,
  EXPENSE_HEADERS,
  fromExpenseRow,
  isExpenseId,
  isMonth,
  toActiveCategories,
  toExpenseRow,
};
