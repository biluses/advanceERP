import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** AES-256-GCM around a secret the operator holds. Sealed values are stored
    in the database so a dump of it alone reveals no customer platform key. */
function key(): Buffer {
  const secret = process.env.APP_SECRET?.trim() || "vitrina-dev-secret-change-me";
  return createHash("sha256").update(secret).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${body.toString("base64url")}`;
}

export function unseal(sealed: string): string | null {
  const [version, ivText, tagText, bodyText] = sealed.split(".");
  if (version !== "v1" || !ivText || !tagText || !bodyText) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(bodyText, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
