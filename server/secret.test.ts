import { beforeAll, describe, expect, it } from "vitest";
import { hashSecret, verifySecret } from "./secret.js";

const PATTERN = "12589";

describe("hashSecret", () => {
  it("should salt each hash so the same pattern never hashes the same twice", async () => {
    expect(await hashSecret(PATTERN)).not.toBe(await hashSecret(PATTERN));
  });
});

describe("verifySecret", () => {
  let storedHash = "";

  beforeAll(async () => {
    storedHash = await hashSecret(PATTERN);
  });

  it("should accept the pattern the hash was made from", async () => {
    expect(await verifySecret(PATTERN, storedHash)).toBe(true);
  });

  it("should reject the same dots drawn in another order", async () => {
    expect(await verifySecret("98521", storedHash)).toBe(false);
  });

  it("should throw when the stored hash uses another scheme", async () => {
    await expect(verifySecret(PATTERN, storedHash.replace("scrypt", "bcrypt"))).rejects.toThrow(
      "PATTERN_HASH is malformed",
    );
  });

  it("should throw when the stored hash is truncated", async () => {
    await expect(verifySecret(PATTERN, storedHash.slice(0, 20))).rejects.toThrow(
      "PATTERN_HASH is malformed",
    );
  });
});
