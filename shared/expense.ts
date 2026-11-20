// Contract shared by the API (server/) and the app (src/). Keep it free of Node and DOM APIs.

const PaymentMethod = {
  CASH: "Tunai",
  E_WALLET: "QRIS/E-wallet",
  DEBIT: "Debit",
  CREDIT_CARD: "Kartu kredit",
} as const;
type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

const MAX_AMOUNT = 1_000_000_000_000;
const MAX_CATEGORY_LENGTH = 50;
const MAX_NOTE_LENGTH = 200;

interface ExpenseFields {
  id: string;
  date: string;
  amount: number;
  category: string;
  method: string;
  note: string;
}

// `method` stays a plain string on read: a value typed by hand in the sheet must not hide the row.
interface Expense extends ExpenseFields {
  createdAt: string;
  updatedAt: string;
}

interface Category {
  name: string;
  order: number;
  monthlyBudget: number;
}

export type { Category, Expense, ExpenseFields };
export { MAX_AMOUNT, MAX_CATEGORY_LENGTH, MAX_NOTE_LENGTH, PaymentMethod };
