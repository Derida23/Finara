import { sign } from "node:crypto";
import { requireEnv } from "./env.js";
import { isRecord } from "./http.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const ASSERTION_LIFETIME_SECONDS = 3600;
const REFRESH_MARGIN_MS = 60_000;
const ESCAPED_NEWLINE = /\\n/g;

interface AccessToken {
  value: string;
  expiresAt: number;
}

interface SheetsRequestInit {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
}

// Reused across invocations while the function instance stays warm.
let cachedToken: AccessToken | null = null;

const toBase64Url = (value: string): string => Buffer.from(value).toString("base64url");

// .env files and some dashboards store the PEM on one line with literal "\n".
const normalizePrivateKey = (key: string): string => key.replace(ESCAPED_NEWLINE, "\n");

const createAssertion = (email: string, privateKey: string, issuedAt: number): string => {
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = toBase64Url(
    JSON.stringify({
      iss: email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + ASSERTION_LIFETIME_SECONDS,
    }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), privateKey);
  return `${header}.${claims}.${signature.toString("base64url")}`;
};

const fetchAccessToken = async (): Promise<AccessToken> => {
  const assertion = createAssertion(
    requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    normalizePrivateKey(requireEnv("GOOGLE_PRIVATE_KEY")),
    Math.floor(Date.now() / 1000),
  );
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data: unknown = await response.json();
  if (!response.ok || !isRecord(data) || typeof data.access_token !== "string") {
    throw new Error(`Google token request failed (${response.status}): ${JSON.stringify(data)}`);
  }
  const lifetimeSeconds = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return { value: data.access_token, expiresAt: Date.now() + lifetimeSeconds * 1000 };
};

const getAccessToken = async (): Promise<string> => {
  if (!cachedToken || cachedToken.expiresAt - REFRESH_MARGIN_MS <= Date.now()) {
    cachedToken = await fetchAccessToken();
  }
  return cachedToken.value;
};

const sheetsRequest = async (path: string, init: SheetsRequestInit = {}): Promise<unknown> => {
  const method = init.method ?? "GET";
  const response = await fetch(`${SHEETS_API}/${requireEnv("SPREADSHEET_ID")}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await getAccessToken()}`,
      "content-type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!response.ok) {
    throw new Error(
      `Sheets ${method} ${path} failed (${response.status}): ${await response.text()}`,
    );
  }
  return response.json();
};

export { createAssertion, normalizePrivateKey, sheetsRequest };
