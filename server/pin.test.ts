import { beforeAll, describe, expect, it } from "vitest";
import { hashPin, isPinFormat, verifyPin } from "./pin.js";

const PIN = "20261120";

describe("isPinFormat", () => {
  it("should reject a non-string value", () => {
    expect(isPinFormat(20261120)).toBe(false);
  });

  it("should reject a PIN shorter than 8 digits", () => {
    expect(isPinFormat("2026112")).toBe(false);
  });

  it("should reject a PIN longer than 8 digits", () => {
    expect(isPinFormat("202611201")).toBe(false);
  });

  it("should reject a PIN containing a non-digit", () => {
    expect(isPinFormat("2026112a")).toBe(false);
  });

  it("should accept exactly 8 digits including a leading zero", () => {
    expect(isPinFormat("01234567")).toBe(true);
  });
});

describe("hashPin", () => {
  it("should salt each hash so the same PIN never hashes the same twice", async () => {
    expect(await hashPin(PIN)).not.toBe(await hashPin(PIN));
  });
});

describe("verifyPin", () => {
  let storedHash = "";

  beforeAll(async () => {
    storedHash = await hashPin(PIN);
  });

  it("should accept the PIN the hash was made from", async () => {
    expect(await verifyPin(PIN, storedHash)).toBe(true);
  });

  it("should reject a different PIN", async () => {
    expect(await verifyPin("20261121", storedHash)).toBe(false);
  });

  it("should throw when the stored hash uses another scheme", async () => {
    await expect(verifyPin(PIN, storedHash.replace("scrypt", "bcrypt"))).rejects.toThrow(
      "PIN_HASH is malformed",
    );
  });

  it("should throw when the stored hash is truncated", async () => {
    await expect(verifyPin(PIN, storedHash.slice(0, 20))).rejects.toThrow("PIN_HASH is malformed");
  });
});
