import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, isAuthorized, verifySessionToken, withAuth } from "./auth.js";

const SECRET = "test-secret-with-at-least-32-characters";
const NOW = new Date("2026-11-20T08:00:00+07:00");

const requestWith = (authorization?: string): Request => {
  const headers = authorization ? { authorization } : undefined;
  return new Request("http://localhost/api/expenses", { headers });
};

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("verifySessionToken", () => {
  it("should reject an empty string", () => {
    expect(verifySessionToken("")).toBe(false);
  });

  it("should reject a token without a signature", () => {
    expect(verifySessionToken("eyJleHAiOjF9")).toBe(false);
  });

  it("should accept a token that has not expired", () => {
    expect(verifySessionToken(createSessionToken(NOW.getTime() + 1000))).toBe(true);
  });

  it("should reject a token once its expiry has passed", () => {
    const token = createSessionToken(NOW.getTime() + 1000);
    vi.advanceTimersByTime(1000);
    expect(verifySessionToken(token)).toBe(false);
  });

  it("should reject a token whose payload was swapped for a later expiry", () => {
    const [, signature] = createSessionToken(NOW.getTime() + 1000).split(".");
    const [laterPayload] = createSessionToken(NOW.getTime() + 999_999).split(".");
    expect(verifySessionToken(`${laterPayload}.${signature}`)).toBe(false);
  });

  it("should reject a token signed with another secret", () => {
    const token = createSessionToken(NOW.getTime() + 1000);
    vi.stubEnv("SESSION_SECRET", `${SECRET}-rotated`);
    expect(verifySessionToken(token)).toBe(false);
  });

  it("should throw when SESSION_SECRET is missing", () => {
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => createSessionToken(NOW.getTime())).toThrow("Missing environment variable");
  });

  it("should throw when SESSION_SECRET is shorter than 32 characters", () => {
    vi.stubEnv("SESSION_SECRET", "too-short");
    expect(() => createSessionToken(NOW.getTime())).toThrow("at least 32 characters");
  });
});

describe("isAuthorized", () => {
  it("should reject a request without an Authorization header", () => {
    expect(isAuthorized(requestWith())).toBe(false);
  });

  it("should reject a scheme other than Bearer", () => {
    const token = createSessionToken(NOW.getTime() + 1000);
    expect(isAuthorized(requestWith(`Basic ${token}`))).toBe(false);
  });

  it("should accept a Bearer header carrying a valid token", () => {
    const token = createSessionToken(NOW.getTime() + 1000);
    expect(isAuthorized(requestWith(`Bearer ${token}`))).toBe(true);
  });
});

describe("withAuth", () => {
  it("should answer 401 UNAUTHORIZED without calling the handler when the token is missing", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const response = await withAuth(handler)(requestWith());
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("should pass the request to the handler when the token is valid", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const token = createSessionToken(NOW.getTime() + 1000);
    const response = await withAuth(handler)(requestWith(`Bearer ${token}`));
    expect(await response.text()).toBe("ok");
  });
});
