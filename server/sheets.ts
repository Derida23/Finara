import {
  type Category,
  compareNewestFirst,
  type Expense,
  fromExpenseRow,
  toActiveCategories,
  toExpenseRow,
} from "./expense.js";
import { sheetsRequest } from "./google.js";
import { isRecord } from "./http.js";

const SheetTitle = {
  EXPENSES: "Transaksi",
  CATEGORIES: "Kategori",
  SUMMARY: "Ringkasan",
} as const;
type SheetTitle = (typeof SheetTitle)[keyof typeof SheetTitle];

const EXPENSE_DATA_RANGE = `${SheetTitle.EXPENSES}!A2:H`;
const CATEGORY_DATA_RANGE = `${SheetTitle.CATEGORIES}!A2:D`;
const FIRST_DATA_ROW = 2;

type Row = readonly unknown[];
type ValueInputOption = "RAW" | "USER_ENTERED";

interface SheetInfo {
  sheetId: number;
  title: string;
}

interface ExpenseLocation {
  rowNumber: number;
  expense: Expense;
}

const valuesPath = (range: string): string => `/values/${encodeURIComponent(range)}`;

const readRows = async (range: string): Promise<Row[]> => {
  const data = await sheetsRequest(`${valuesPath(range)}?valueRenderOption=UNFORMATTED_VALUE`);
  if (!isRecord(data) || !Array.isArray(data.values)) {
    return [];
  }
  return data.values.filter((row): row is unknown[] => Array.isArray(row));
};

// RAW keeps user text such as "=SUM(...)" in a note from ever becoming a formula.
const writeRows = async (range: string, rows: unknown[][], input: ValueInputOption = "RAW") => {
  await sheetsRequest(`${valuesPath(range)}?valueInputOption=${input}`, {
    method: "PUT",
    body: { values: rows },
  });
};

const appendRows = async (range: string, rows: unknown[][]): Promise<void> => {
  await sheetsRequest(
    `${valuesPath(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: { values: rows },
    },
  );
};

const batchUpdate = async (requests: unknown[]): Promise<void> => {
  await sheetsRequest(":batchUpdate", { method: "POST", body: { requests } });
};

const listSheets = async (): Promise<SheetInfo[]> => {
  const data = await sheetsRequest("?fields=sheets.properties(sheetId,title)");
  const sheets = isRecord(data) && Array.isArray(data.sheets) ? data.sheets : [];
  return sheets.flatMap((sheet) => {
    const properties = isRecord(sheet) ? sheet.properties : undefined;
    if (!isRecord(properties)) {
      return [];
    }
    const { sheetId, title } = properties;
    return typeof sheetId === "number" && typeof title === "string" ? [{ sheetId, title }] : [];
  });
};

const findSheetId = async (title: SheetTitle): Promise<number> => {
  const sheet = (await listSheets()).find((candidate) => candidate.title === title);
  if (!sheet) {
    throw new Error(`Sheet "${title}" not found; run \`pnpm setup-sheet\``);
  }
  return sheet.sheetId;
};

const listExpenses = async (month: string): Promise<Expense[]> => {
  const rows = await readRows(EXPENSE_DATA_RANGE);
  return rows
    .map((row) => fromExpenseRow(row))
    .filter((expense): expense is Expense => expense?.date.startsWith(`${month}-`) === true)
    .sort(compareNewestFirst);
};

const findExpense = async (id: string): Promise<ExpenseLocation | null> => {
  const rows = await readRows(EXPENSE_DATA_RANGE);
  for (const [index, row] of rows.entries()) {
    if (row[0] === id) {
      const expense = fromExpenseRow(row);
      return expense ? { rowNumber: index + FIRST_DATA_ROW, expense } : null;
    }
  }
  return null;
};

const appendExpense = async (expense: Expense): Promise<void> => {
  await appendRows(`${SheetTitle.EXPENSES}!A:H`, [toExpenseRow(expense)]);
};

const updateExpenseRow = async (rowNumber: number, expense: Expense): Promise<void> => {
  const range = `${SheetTitle.EXPENSES}!A${rowNumber}:H${rowNumber}`;
  await writeRows(range, [toExpenseRow(expense)]);
};

const deleteExpenseRow = async (rowNumber: number): Promise<void> => {
  const sheetId = await findSheetId(SheetTitle.EXPENSES);
  await batchUpdate([
    {
      deleteDimension: {
        range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
      },
    },
  ]);
};

const listCategories = async (): Promise<Category[]> => {
  return toActiveCategories(await readRows(CATEGORY_DATA_RANGE));
};

export type { SheetInfo };
export {
  appendExpense,
  batchUpdate,
  deleteExpenseRow,
  findExpense,
  listCategories,
  listExpenses,
  listSheets,
  SheetTitle,
  updateExpenseRow,
  writeRows,
};
