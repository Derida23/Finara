import { CATEGORY_HEADERS, EXPENSE_HEADERS } from "../server/expense.js";
import { sheetsRequest } from "../server/google.js";
import { isRecord } from "../server/http.js";
import { batchUpdate, listSheets, SheetTitle, writeRows } from "../server/sheets.js";

const DEFAULT_CATEGORIES = [
  "Makan & Minum",
  "Transportasi",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Kesehatan",
  "Lainnya",
];

const currentMonth = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
}).format(new Date());

interface GridRange {
  sheetId: number;
  startColumnIndex: number;
  endColumnIndex: number;
  startRowIndex?: number;
  endRowIndex?: number;
}

// Text format stops Sheets from turning "2026-11-20" typed by hand into a date serial.
const formatAsText = (range: GridRange) => {
  return {
    repeatCell: {
      range,
      cell: { userEnteredFormat: { numberFormat: { type: "TEXT" } } },
      fields: "userEnteredFormat.numberFormat",
    },
  };
};

const checkboxColumn = (sheetId: number, columnIndex: number) => {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      },
      rule: { condition: { type: "BOOLEAN" }, strict: true },
    },
  };
};

// Sheets parses formulas sent through the API in the spreadsheet's own locale: where the decimal
// mark is a comma (in_ID, de_DE, ...), function arguments are separated by ";" instead of ",".
const readArgumentSeparator = async (): Promise<string> => {
  const data = await sheetsRequest("?fields=properties.locale");
  const locale = isRecord(data) && isRecord(data.properties) ? data.properties.locale : undefined;
  if (typeof locale !== "string") {
    return ",";
  }
  try {
    return new Intl.NumberFormat(locale.replace("_", "-")).format(1.5).includes(",") ? ";" : ",";
  } catch {
    return ",";
  }
};

// Rows 3–5 of Ringkasan. Dates are stored as text, so a month matches with a "YYYY-MM*" wildcard.
const summaryFormulaRows = (separator: string): string[][] => {
  const call = (name: string, ...args: string[]): string => {
    return `${name}(${args.join(`${separator} `)})`;
  };
  const inMonth = '$B$1&"*"';
  const isActive = ['Kategori!A2:A<>""', "Kategori!D2:D<>FALSE"];
  const isBlankRow = 'A5:A=""';
  const spentPerCategory = call(
    "SUMIFS",
    "Transaksi!C2:C",
    "Transaksi!D2:D",
    "A5:A",
    "Transaksi!B2:B",
    inMonth,
  );
  const budgetPerCategory = call(
    "IFERROR",
    call("VLOOKUP", "A5:A", "Kategori!A2:C", "3", "FALSE"),
    "0",
  );
  return [
    ["Kategori", "Pengeluaran", "Budget", "Sisa"],
    [
      "Total",
      `=${call("SUMIFS", "Transaksi!C2:C", "Transaksi!B2:B", inMonth)}`,
      "=SUM(C5:C)",
      "=C4-B4",
    ],
    [
      `=${call("SORT", call("FILTER", "Kategori!A2:A", ...isActive), call("FILTER", "Kategori!B2:B", ...isActive), "TRUE")}`,
      `=${call("ARRAYFORMULA", call("IF", isBlankRow, '""', spentPerCategory))}`,
      `=${call("ARRAYFORMULA", call("IF", isBlankRow, '""', budgetPerCategory))}`,
      `=${call("ARRAYFORMULA", call("IF", isBlankRow, '""', "C5:C-B5:B"))}`,
    ],
  ];
};

const separator = await readArgumentSeparator();
const existingTitles = new Set((await listSheets()).map((sheet) => sheet.title));
const missing = Object.values(SheetTitle).filter((title) => !existingTitles.has(title));

if (missing.length === 0) {
  console.log("Semua tab sudah ada.");
} else {
  await batchUpdate(
    missing.map((title) => {
      const frozenRowCount = title === SheetTitle.SUMMARY ? 4 : 1;
      return { addSheet: { properties: { title, gridProperties: { frozenRowCount } } } };
    }),
  );
  const sheetIds = new Map((await listSheets()).map((sheet) => [sheet.title, sheet.sheetId]));
  const sheetIdOf = (title: string): number => {
    const sheetId = sheetIds.get(title);
    if (sheetId === undefined) {
      throw new Error(`Sheet "${title}" was not created`);
    }
    return sheetId;
  };

  if (missing.includes(SheetTitle.EXPENSES)) {
    const sheetId = sheetIdOf(SheetTitle.EXPENSES);
    await writeRows(`${SheetTitle.EXPENSES}!A1:H1`, [EXPENSE_HEADERS]);
    await batchUpdate([
      formatAsText({ sheetId, startColumnIndex: 0, endColumnIndex: 2 }),
      formatAsText({ sheetId, startColumnIndex: 6, endColumnIndex: 8 }),
    ]);
  }

  if (missing.includes(SheetTitle.CATEGORIES)) {
    const rows = DEFAULT_CATEGORIES.map((name, index) => [name, index + 1, 0, true]);
    await writeRows(`${SheetTitle.CATEGORIES}!A1:D${rows.length + 1}`, [CATEGORY_HEADERS, ...rows]);
    await batchUpdate([checkboxColumn(sheetIdOf(SheetTitle.CATEGORIES), 3)]);
  }

  if (missing.includes(SheetTitle.SUMMARY)) {
    const sheetId = sheetIdOf(SheetTitle.SUMMARY);
    // Only B1 (the month input); the formulas further down column B must stay formulas.
    const monthCell = { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 };
    await batchUpdate([formatAsText({ sheetId, ...monthCell })]);
    const monthRow = [["Bulan", currentMonth, "Ganti B1 dengan bulan lain (format YYYY-MM)"]];
    await writeRows(`${SheetTitle.SUMMARY}!A1:C1`, monthRow, "USER_ENTERED");
  }

  console.log(`Tab dibuat: ${missing.join(", ")}.`);
}

// The formula block is owned by this script; rewriting it on every run repairs a tab whose
// formulas were written with the wrong separator. B1 (the chosen month) is left alone.
await writeRows(`${SheetTitle.SUMMARY}!A3:D5`, summaryFormulaRows(separator), "USER_ENTERED");
console.log(`Rumus Ringkasan ditulis ulang (pemisah argumen "${separator}").`);
