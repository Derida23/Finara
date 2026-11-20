// 12 digits keeps the amount under the API limit of Rp1.000.000.000.000.
const MAX_AMOUNT_DIGITS = 12;
const LEADING_ZEROS = /^0+/;

const amountFormatter = new Intl.NumberFormat("id-ID");
const timeFormatter = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });
const shortDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const dayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
});
const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

const formatRupiah = (amount: number): string => `Rp${amountFormatter.format(amount)}`;

const appendAmountKey = (amount: number, key: string): number => {
  const digits = `${amount === 0 ? "" : amount}${key}`.replace(LEADING_ZEROS, "");
  if (digits.length > MAX_AMOUNT_DIGITS) {
    return amount;
  }
  return digits === "" ? 0 : Number(digits);
};

const removeAmountDigit = (amount: number): number => Math.floor(amount / 10);

const toLocalDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

// "YYYY-MM-DDT00:00:00" without an offset parses as local midnight.
const fromLocalDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00`);

const shiftDays = (isoDate: string, days: number): string => {
  const date = fromLocalDate(isoDate);
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
};

const dateLabel = (isoDate: string, today: string): string => {
  if (isoDate === today) {
    return "Hari ini";
  }
  if (isoDate === shiftDays(today, -1)) {
    return "Kemarin";
  }
  return shortDateFormatter.format(fromLocalDate(isoDate));
};

const formatTime = (isoDateTime: string): string => {
  const date = new Date(isoDateTime);
  return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
};

const dayHeading = (isoDate: string, today: string): string => {
  const label = dateLabel(isoDate, today);
  return label === "Hari ini" || label === "Kemarin"
    ? label
    : dayFormatter.format(fromLocalDate(isoDate));
};

const monthLabel = (month: string): string => monthFormatter.format(fromLocalDate(`${month}-01`));

const shiftMonth = (month: string, delta: number): string => {
  const date = fromLocalDate(`${month}-01`);
  date.setMonth(date.getMonth() + delta);
  return toLocalDate(date).slice(0, 7);
};

export {
  appendAmountKey,
  dateLabel,
  dayHeading,
  formatRupiah,
  formatTime,
  monthLabel,
  removeAmountDigit,
  shiftDays,
  shiftMonth,
  toLocalDate,
};
