import { put } from "@vercel/blob/client";

type Driver = "blob" | "local";

let resolved: Promise<Driver> | null = null;

/** Which store the browser sends files to. NEXT_PUBLIC_STORAGE_DRIVER pins it
    at build time; otherwise the server is asked once per page load, so a
    deployment that only sets BLOB_READ_WRITE_TOKEN still uploads to Blob. */
export function storageDriver(): Promise<Driver> {
  const pinned = process.env.NEXT_PUBLIC_STORAGE_DRIVER;
  if (pinned === "blob" || pinned === "local") return Promise.resolve(pinned);
  resolved ??= fetch("/api/upload")
    .then((res) => res.json() as Promise<{ driver?: unknown }>)
    .then((body) => (body.driver === "blob" ? "blob" : "local"))
    .catch(() => "local" as const);
  return resolved;
}

export async function uploadMedia(file: File): Promise<{ url: string }> {
  return (await storageDriver()) === "blob" ? uploadToBlob(file) : uploadToLocal(file);
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
