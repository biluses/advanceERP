"use server";

import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { newId } from "@/server/ids";
import { requireViewer } from "@/server/session";

export interface UploadRecord {
  id: string;
  url: string;
  kind: "image" | "video" | "audio";
  name: string;
  createdAt: number;
}

const MAX_UPLOADS = 120;

export async function listUploads(): Promise<UploadRecord[]> {
  const viewer = await requireViewer();
  const rows = await db
    .select()
    .from(schema.upload)
    .where(eq(schema.upload.workspaceId, viewer.workspace.id))
    .orderBy(desc(schema.upload.createdAt))
    .limit(MAX_UPLOADS);
  return rows.map((row) => ({ id: row.id, url: row.url, kind: row.kind, name: row.name, createdAt: row.createdAt.getTime() }));
}

/** A file that reached storage joins the workspace shelf, one entry per URL. */
export async function rememberUpload(input: { url: string; kind: string; name: string }): Promise<UploadRecord> {
  const viewer = await requireViewer();
  const url = String(input.url ?? "").trim();
  if (!/^https?:\/\//.test(url)) throw new Error("Invalid upload URL");
  const kind = input.kind === "video" || input.kind === "audio" ? input.kind : "image";
  const name = String(input.name ?? "").slice(0, 180) || "file";
  const now = new Date();
  const existing = await db
    .select()
    .from(schema.upload)
    .where(and(eq(schema.upload.workspaceId, viewer.workspace.id), eq(schema.upload.url, url)))
    .limit(1);
  if (existing[0]) {
    await db.update(schema.upload).set({ createdAt: now, name }).where(eq(schema.upload.id, existing[0].id));
    return { id: existing[0].id, url, kind: existing[0].kind, name, createdAt: now.getTime() };
  }
  const id = newId();
  await db.insert(schema.upload).values({ id, workspaceId: viewer.workspace.id, url, kind, name, createdAt: now });
  return { id, url, kind, name, createdAt: now.getTime() };
}

export async function forgetUpload(id: string): Promise<void> {
  const viewer = await requireViewer();
  await db.delete(schema.upload).where(and(eq(schema.upload.workspaceId, viewer.workspace.id), eq(schema.upload.id, id)));
}
