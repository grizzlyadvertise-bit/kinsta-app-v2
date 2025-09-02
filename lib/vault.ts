// lib/vault.ts
import crypto from "crypto";

const b64 = process.env.APP_ENCRYPTION_KEY;
if (!b64) {
  throw new Error("APP_ENCRYPTION_KEY missing");
}
const key = Buffer.from(b64, "base64");
if (key.length !== 32) {
  throw new Error("APP_ENCRYPTION_KEY must be base64 of 32 bytes");
}

export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64"); // iv|tag|enc
}

export function decrypt(b64In: string) {
  const buf = Buffer.from(b64In, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
