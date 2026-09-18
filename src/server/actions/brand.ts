"use server";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { brandKitSchema, EMPTY_BRAND, type BrandKit } from "@/domain/brand";
import { requireViewer } from "@/server/session";
import { flatten, type SaveResult } from "@/server/validation";

export async function getBrandKit(): Promise<BrandKit> {
  const viewer = await requireViewer();
  return readBrandKit(viewer.workspace.id);
}

export async function readBrandKit(workspaceId: string): Promise<BrandKit> {
  const [row] = await db.select().from(schema.brandKit).where(eq(schema.brandKit.workspaceId, workspaceId));
  if (!row) return EMPTY_BRAND;
  return {
    name: row.name,
    tagline: row.tagline,
    tone: row.tone,
    style: row.style,
    palette: row.palette,
    audience: row.audience,
    avoid: row.avoid,
    logoUrl: row.logoUrl,
  };
}

export async function saveBrandKit(input: unknown): Promise<SaveResult<BrandKit>> {
  const viewer = await requireViewer();
  const parsed = brandKitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const kit = parsed.data;
  const now = new Date();
  await db
    .insert(schema.brandKit)
    .values({ workspaceId: viewer.workspace.id, ...kit, updatedAt: now })
    .onConflictDoUpdate({ target: schema.brandKit.workspaceId, set: { ...kit, updatedAt: now } });
  if (kit.name && viewer.workspace.name !== kit.name) {
    await db.update(schema.workspace).set({ name: kit.name, updatedAt: now }).where(eq(schema.workspace.id, viewer.workspace.id));
  }
  return { ok: true, value: kit };
}
