import { createSessionToken, SESSION_TTL_MS } from "../server/auth.js";
import { requireEnv } from "../server/env.js";
import { isRecord, json, jsonError, readJson, withErrorHandling } from "../server/http.js";
import { verifySecret } from "../server/secret.js";
import { isPatternString } from "../shared/pattern.js";

// Vercel functions keep no state between calls, so failed attempts cannot be counted;
// a fixed delay per wrong pattern slows guessing instead.
const FAILED_ATTEMPT_DELAY_MS = 1000;

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const POST = withErrorHandling(async (request) => {
  const body = await readJson(request);
  const pattern = isRecord(body) ? body.pattern : undefined;
  if (!isPatternString(pattern)) {
    return jsonError(400, "INVALID_PATTERN_FORMAT");
  }
  if (!(await verifySecret(pattern, requireEnv("PATTERN_HASH")))) {
    await wait(FAILED_ATTEMPT_DELAY_MS);
    return jsonError(401, "INVALID_PATTERN");
  }
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return json(200, { token: createSessionToken(expiresAt), expiresAt });
});

export { POST };
