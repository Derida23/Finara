import { createSessionToken, SESSION_TTL_MS } from "../server/auth.js";
import { requireEnv } from "../server/env.js";
import { json, jsonError, readJson, withErrorHandling } from "../server/http.js";
import { isPinFormat, verifyPin } from "../server/pin.js";

// Vercel functions keep no state between calls, so failed attempts cannot be counted;
// a fixed delay per wrong PIN slows guessing instead.
const FAILED_ATTEMPT_DELAY_MS = 1000;

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const readPin = (body: unknown): unknown => {
  if (typeof body === "object" && body !== null && "pin" in body) {
    return body.pin;
  }
  return undefined;
};

const POST = withErrorHandling(async (request) => {
  const pin = readPin(await readJson(request));
  if (!isPinFormat(pin)) {
    return jsonError(400, "INVALID_PIN_FORMAT");
  }
  if (!(await verifyPin(pin, requireEnv("PIN_HASH")))) {
    await wait(FAILED_ATTEMPT_DELAY_MS);
    return jsonError(401, "INVALID_PIN");
  }
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return json(200, { token: createSessionToken(expiresAt), expiresAt });
});

export { POST };
