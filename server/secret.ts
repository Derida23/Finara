import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Hashes the unlock secret (the pattern string). Stored as "scrypt:<salt>:<key>" in PATTERN_HASH.

const HASH_SCHEME = "scrypt";
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const SCRYPT_OPTIONS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

interface StoredHash {
  salt: Buffer;
  key: Buffer;
}

const deriveKey = (secret: string, salt: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    scrypt(secret, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
};

const parseStoredHash = (storedHash: string): StoredHash => {
  const [scheme, saltText, keyText, ...rest] = storedHash.split(":");
  const key = Buffer.from(keyText ?? "", "base64url");
  if (scheme !== HASH_SCHEME || !saltText || key.length !== KEY_LENGTH || rest.length > 0) {
    throw new Error("PATTERN_HASH is malformed; regenerate it with `pnpm set-pattern`");
  }
  return { salt: Buffer.from(saltText, "base64url"), key };
};

const hashSecret = async (secret: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(secret, salt);
  return [HASH_SCHEME, salt.toString("base64url"), key.toString("base64url")].join(":");
};

const verifySecret = async (secret: string, storedHash: string): Promise<boolean> => {
  const { salt, key } = parseStoredHash(storedHash);
  return timingSafeEqual(await deriveKey(secret, salt), key);
};

export { hashSecret, verifySecret };
