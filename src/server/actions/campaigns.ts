"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/db/client";
import { isChannelId } from "@/domain/channels";
import { PRESETS } from "@/domain/presets";
import { newId } from "@/server/ids";
import { requireViewer } from "@/server/session";

import { flatten, type SaveResult } from "@/server/validation";

export type Campaign = {
  id: string;
  productId: string;
  name: string;
  scene: string;
  presetIds: string[];
  channelIds: string[];
  createdAt: number;
};

const campaignSchema = z.object({
  productId: z.string().min(1, "Pick a product"),
  name: z.string().trim().min(1, "Give the campaign a name").max(120),
  scene: z.string().trim().max(400).default(""),
  presetIds: z
    .array(z.string())
    .min(1, "Pick at least one preset")
    .refine((ids) => ids.every((id) => PRESETS.some((preset) => preset.id === id)), "Unknown preset"),
  channelIds: z
    .array(z.string())
    .min(1, "Pick at least one channel")
    .refine((ids) => ids.every(isChannelId), "Unknown channel"),
});

export type CampaignInput = z.input<typeof campaignSchema>;

function toCampaign(row: typeof schema.campaign.$inferSelect): Campaign {
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    scene: row.scene,
    presetIds: row.presetIds,
    channelIds: row.channelIds,
    createdAt: row.createdAt.getTime(),
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const viewer = await requireViewer();
  const rows = await db
    .select()
    .from(schema.campaign)
    .where(eq(schema.campaign.workspaceId, viewer.workspace.id))
    .orderBy(desc(schema.campaign.createdAt));
  return rows.map(toCampaign);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const viewer = await requireViewer();
  const [row] = await db
    .select()
    .from(schema.campaign)
    .where(and(eq(schema.campaign.workspaceId, viewer.workspace.id), eq(schema.campaign.id, id)));
  return row ? toCampaign(row) : null;
}

export async function createCampaign(input: unknown): Promise<SaveResult<Campaign>> {
  const viewer = await requireViewer();
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const [product] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(and(eq(schema.product.workspaceId, viewer.workspace.id), eq(schema.product.id, parsed.data.productId)));
  if (!product) return { ok: false, errors: { productId: "Product not found" } };
  const now = new Date();
  const row = { id: newId(), workspaceId: viewer.workspace.id, ...parsed.data, createdAt: now, updatedAt: now };
  await db.insert(schema.campaign).values(row);
  return { ok: true, value: toCampaign(row) };
}

export async function deleteCampaign(id: string): Promise<void> {
  const viewer = await requireViewer();
  await db.delete(schema.campaign).where(and(eq(schema.campaign.workspaceId, viewer.workspace.id), eq(schema.campaign.id, id)));
}
