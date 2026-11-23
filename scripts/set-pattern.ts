import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { hashSecret } from "../server/secret.js";
import { connectDots, isCompletePattern, parseDots, toPatternString } from "../shared/pattern.js";

const prompt = createInterface({ input: stdin, output: stdout });
// The iterator buffers lines, so piped input works too; readline's question() drops them.
const lines = prompt[Symbol.asyncIterator]();

const ask = async (question: string): Promise<string> => {
  stdout.write(question);
  const { value } = await lines.next();
  return typeof value === "string" ? value.trim() : "";
};

const fail = (message: string): never => {
  console.error(`\n${message}`);
  process.exit(1);
};

console.log("Titik pola bernomor seperti tombol telepon:\n\n  1  2  3\n  4  5  6\n  7  8  9\n");
const typed = await ask("Pola baru (nomor titik 1–9, contoh 1-2-5-8-9): ");
const repeated = await ask("Ulangi pola: ");
prompt.close();

const typedDots = parseDots(typed) ?? fail("Pola hanya boleh berisi nomor titik 1–9.");
const repeatedDots = parseDots(repeated) ?? fail("Pola hanya boleh berisi nomor titik 1–9.");
if (new Set(typedDots).size !== typedDots.length) {
  fail("Tiap titik hanya boleh dipakai sekali.");
}

// The same rule as the lock screen: a jumped unused dot joins the pattern, so store what will
// actually be drawn.
const pattern = connectDots(typedDots);
if (!isCompletePattern(pattern)) {
  fail("Pola minimal 4 titik berbeda.");
}
if (toPatternString(pattern) !== toPatternString(connectDots(repeatedDots))) {
  fail("Pola tidak sama. Jalankan ulang perintah ini.");
}

const joined = pattern.filter((dot) => !typedDots.includes(dot));
if (joined.length > 0) {
  console.log(`\nTitik ${joined.join(", ")} ikut tersambung (seperti di Android).`);
}

console.log("\nTempel baris ini ke .env.local dan ke Environment Variables di Vercel:\n");
console.log(`PATTERN_HASH=${await hashSecret(toPatternString(pattern))}\n`);
