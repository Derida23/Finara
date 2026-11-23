import type { Category, Expense, ExpenseFields } from "../../shared/expense";
import { type Session, session } from "./session.svelte";

interface NewExpense extends ExpenseFields {
  createdAt: string;
}

type ExpenseChanges = Omit<ExpenseFields, "id">;

interface ApiRequest {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const readErrorCode = async (response: Response): Promise<string> => {
  const data: unknown = await response.json().catch(() => null);
  const hasCode = typeof data === "object" && data !== null && "error" in data;
  return hasCode && typeof data.error === "string" ? data.error : "UNKNOWN";
};

const send = async (path: string, init: ApiRequest = {}): Promise<Response> => {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (session.token) {
    headers.authorization = `Bearer ${session.token}`;
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, "NETWORK");
  }
  if (response.status === 401 && path !== "/login") {
    session.lock();
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorCode(response));
  }
  return response;
};

// Responses come from our own API in api/, which shares its types through shared/expense.ts.
const sendJson = async <T>(path: string, init?: ApiRequest): Promise<T> => {
  const response = await send(path, init);
  return (await response.json()) as T;
};

// UUID v4 from getRandomValues: crypto.randomUUID only exists on HTTPS, not on a LAN dev URL.
const createExpenseId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
};

const login = (pattern: string): Promise<Session> => {
  return sendJson<Session>("/login", { method: "POST", body: { pattern } });
};

const listCategories = async (): Promise<Category[]> => {
  return (await sendJson<{ categories: Category[] }>("/categories")).categories;
};

const listExpenses = async (month: string): Promise<Expense[]> => {
  const path = `/expenses?month=${encodeURIComponent(month)}`;
  return (await sendJson<{ expenses: Expense[] }>(path)).expenses;
};

const createExpense = async (expense: NewExpense): Promise<Expense> => {
  const body = await sendJson<{ expense: Expense }>("/expenses", { method: "POST", body: expense });
  return body.expense;
};

const deleteExpense = async (id: string): Promise<void> => {
  await send(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
};

const updateExpense = async (id: string, changes: ExpenseChanges): Promise<Expense> => {
  const path = `/expenses/${encodeURIComponent(id)}`;
  return (await sendJson<{ expense: Expense }>(path, { method: "PATCH", body: changes })).expense;
};

export type { ExpenseChanges, NewExpense };
export {
  ApiError,
  createExpense,
  createExpenseId,
  deleteExpense,
  listCategories,
  listExpenses,
  login,
  updateExpense,
};
