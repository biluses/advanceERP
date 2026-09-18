import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { newId } from "./ids";

export type StorageDriver = "blob" | "local";

/** Uploads go client-direct to Vercel Blob when a token is present, else to
    the local disk under DATA_DIR, served back by /api/files. The local driver
    exists so a laptop or a single Docker host works without a Blob store —
    the platform still has to be able to fetch the resulting URL. */
export function storageDriver(): StorageDriver {
  const forced = process.env.STORAGE_DRIVER?.trim();
  if (forced === "local" || forced === "blob") return forced;
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() ? "blob" : "local";
}

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "audio/wav",
  "audio/x-wav",
] as const;

export const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

export function dataDir(): string {
  return resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR?.trim() || "./data");
}

export function uploadsDir(): string {
  return join(dataDir(), "uploads");
}

export function sanitizeFilename(filename: string): string {
  const base = filename.replaceAll("\\", "/").split("/").pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "");
  return cleaned.slice(0, 120) || "file";
}

/** Writes bytes under uploads/<workspace>/<id>-<name> and returns the path
    the files route serves it at. The id makes the URL unguessable, which is
    the only protection a URL the platform fetches anonymously can have. */
export async function storeLocal(workspaceId: string, filename: string, bytes: Uint8Array): Promise<string> {
  const name = `${newId()}-${sanitizeFilename(filename)}`;
  const dir = join(uploadsDir(), workspaceId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
  return `${workspaceId}/${name}`;
}

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/** Resolves a served path back to disk, refusing anything that could step
    outside the uploads directory. */
export function localPath(segments: string[]): string | null {
  if (segments.length !== 2 || !segments.every((segment) => SAFE_SEGMENT.test(segment) && !segment.startsWith("."))) {
    return null;
  }
  return join(uploadsDir(), ...segments);
}

export function contentTypeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

/** The origin the platform can reach files at. APP_URL in production; the
    request's own origin in development. */
export function publicOrigin(request: Request): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return new URL(request.url).origin;
}
