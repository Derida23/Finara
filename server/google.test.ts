import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAssertion, normalizePrivateKey } from "./google.js";

const EMAIL = "saving@example.iam.gserviceaccount.com";
const ISSUED_AT = 1_795_000_000;
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const decodePart = (part: string | undefined): unknown => {
  return JSON.parse(Buffer.from(part ?? "", "base64url").toString("utf8"));
};

describe("normalizePrivateKey", () => {
  it("should leave a key with real newlines untouched", () => {
    expect(normalizePrivateKey("line1\nline2")).toBe("line1\nline2");
  });

  it("should turn escaped \\n sequences into newlines", () => {
    expect(normalizePrivateKey("line1\\nline2\\n")).toBe("line1\nline2\n");
  });
});

describe("createAssertion", () => {
  it("should declare an RS256 JWT header", () => {
    const [header] = createAssertion(EMAIL, privateKey, ISSUED_AT).split(".");
    expect(decodePart(header)).toEqual({ alg: "RS256", typ: "JWT" });
  });

  it("should claim the spreadsheets scope for one hour", () => {
    const [, claims] = createAssertion(EMAIL, privateKey, ISSUED_AT).split(".");
    expect(decodePart(claims)).toEqual({
      iss: EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: ISSUED_AT,
      exp: ISSUED_AT + 3600,
    });
  });

  it("should carry a signature that verifies against the public key", () => {
    const [header, claims, signature] = createAssertion(EMAIL, privateKey, ISSUED_AT).split(".");
    const isValid = verify(
      "sha256",
      Buffer.from(`${header}.${claims}`),
      publicKey,
      Buffer.from(signature ?? "", "base64url"),
    );
    expect(isValid).toBe(true);
  });
});
