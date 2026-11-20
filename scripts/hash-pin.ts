import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { hashPin, isPinFormat } from "../server/pin.js";

const prompt = createInterface({ input: stdin, output: stdout });
// The iterator buffers lines, so piped input works too; readline's question() drops them.
const lines = prompt[Symbol.asyncIterator]();

const ask = async (question: string): Promise<string> => {
  stdout.write(question);
  const { value } = await lines.next();
  return typeof value === "string" ? value.trim() : "";
};

const pin = await ask("PIN baru (8 digit): ");
const confirmation = await ask("Ulangi PIN: ");
prompt.close();

if (!isPinFormat(pin)) {
  console.error("\nPIN harus tepat 8 digit angka.");
  process.exit(1);
}

if (pin !== confirmation) {
  console.error("\nPIN tidak sama. Jalankan ulang perintah ini.");
  process.exit(1);
}

console.log("\nTempel baris ini ke .env.local dan ke Environment Variables di Vercel:\n");
console.log(`PIN_HASH=${await hashPin(pin)}\n`);
