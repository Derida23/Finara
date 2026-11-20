import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "./env.js";
import { type Handler, jsonError } from "./http.js";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MIN_SECRET_LENGTH = 32;
const BEARER_PATTERN = /^Bearer (\S+)$/;

const readSecret = (): string => {
  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  return secret;
};

const sign = (payload: string): string => {
  return createHmac("sha256", readSecret()).update(payload).digest("base64url");
};

const readExpiry = (payload: string): number | null => {
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const isPayload = typeof value === "object" && value !== null && "exp" in value;
    return isPayload && typeof value.exp === "number" ? value.exp : null;
  } catch {
    return null;
  }
};

const createSessionToken = (expiresAt: number): string => {
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

const verifySessionToken = (token: string): boolean => {
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) {
    return false;
  }
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return false;
  }
  const expiresAt = readExpiry(payload);
  return expiresAt !== null && expiresAt > Date.now();
};

const isAuthorized = (request: Request): boolean => {
  const token = request.headers.get("authorization")?.match(BEARER_PATTERN)?.[1];
  return token !== undefined && verifySessionToken(token);
};

const withAuth = (handler: Handler): Handler => {
  return async (request) => {
    if (!isAuthorized(request)) {
      return jsonError(401, "UNAUTHORIZED");
    }
    return handler(request);
  };
};

export { createSessionToken, isAuthorized, SESSION_TTL_MS, verifySessionToken, withAuth };
