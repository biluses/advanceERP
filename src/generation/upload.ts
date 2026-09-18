import { put } from "@vercel/blob/client";

/** Which store the browser sends files to. Set at build time from the same
    variable the server reads, so the two never disagree. */
export function storageDriver(): "blob" | "local" {
  return process.env.NEXT_PUBLIC_STORAGE_DRIVER === "blob" ? "blob" : "local";
}

export async function uploadMedia(file: File): Promise<{ url: string }> {
  return storageDriver() === "blob" ? uploadToBlob(file) : uploadToLocal(file);
}

async function uploadToLocal(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.set("file", file, file.name);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
  if (!res.ok || typeof body.url !== "string") {
    throw new Error(typeof body.error === "string" ? body.error : "Upload failed");
  }
  return { url: body.url };
}

async function uploadToBlob(file: File): Promise<{ url: string }> {
  const res = await fetch("/api/blob", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname: file.name, clientPayload: null, multipart: false },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { clientToken?: unknown; pathname?: unknown; error?: unknown };
  if (!res.ok || typeof body.clientToken !== "string" || typeof body.pathname !== "string") {
    throw new Error(typeof body.error === "string" ? body.error : "Failed to retrieve the client token");
  }
  const blob = await put(body.pathname, file, { access: "public", token: body.clientToken });
  return { url: blob.url };
}
