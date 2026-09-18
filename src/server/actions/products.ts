"use server";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { productSchema, slugify, type Product, type ProductAsset } from "@/domain/brand";
import { newId } from "@/server/ids";
import { requireViewer } from "@/server/session";

import { flatten, type SaveResult } from "@/server/validation";

function toAsset(row: typeof schema.productAsset.$inferSelect): ProductAsset {
  return { id: row.id, url: row.url, kind: row.kind, name: row.name };
}

async function assetsFor(productIds: string[]): Promise<Map<string, ProductAsset[]>> {
  const out = new Map<string, ProductAsset[]>();
  if (productIds.length === 0) return out;
  const rows = await db
    .select()
    .from(schema.productAsset)
    .orderBy(asc(schema.productAsset.position), asc(schema.productAsset.createdAt));
  for (const row of rows) {
    if (!productIds.includes(row.productId)) continue;
    const list = out.get(row.productId) ?? [];
    list.push(toAsset(row));
    out.set(row.productId, list);
  }
  return out;
}

function toProduct(row: typeof schema.product.$inferSelect, assets: ProductAsset[]): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as Product["category"],
    description: row.description,
    features: row.features,
    appearance: row.appearance,
    audience: row.audience,
    priceLabel: row.priceLabel,
    assets,
  };
}

export async function listProducts(): Promise<Product[]> {
  const viewer = await requireViewer();
  const rows = await db
    .select()
    .from(schema.product)
    .where(and(eq(schema.product.workspaceId, viewer.workspace.id), isNull(schema.product.archivedAt)))
    .orderBy(desc(schema.product.updatedAt));
  const assets = await assetsFor(rows.map((row) => row.id));
  return rows.map((row) => toProduct(row, assets.get(row.id) ?? []));
}

export async function getProduct(id: string): Promise<Product | null> {
  const viewer = await requireViewer();
  const [row] = await db
    .select()
    .from(schema.product)
    .where(and(eq(schema.product.workspaceId, viewer.workspace.id), eq(schema.product.id, id)));
  if (!row) return null;
  const assets = await assetsFor([row.id]);
  return toProduct(row, assets.get(row.id) ?? []);
}

async function uniqueSlug(workspaceId: string, name: string, exceptId?: string): Promise<string> {
  const base = slugify(name, "product");
  const rows = await db
    .select({ id: schema.product.id, slug: schema.product.slug })
    .from(schema.product)
    .where(eq(schema.product.workspaceId, workspaceId));
  const taken = new Set(rows.filter((row) => row.id !== exceptId).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function createProduct(input: unknown): Promise<SaveResult<Product>> {
  const viewer = await requireViewer();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const now = new Date();
  const id = newId();
  const slug = await uniqueSlug(viewer.workspace.id, parsed.data.name);
  await db.insert(schema.product).values({ id, workspaceId: viewer.workspace.id, slug, ...parsed.data, createdAt: now, updatedAt: now });
  return { ok: true, value: { id, slug, ...parsed.data, assets: [] } };
}

export async function updateProduct(id: string, input: unknown): Promise<SaveResult<Product>> {
  const viewer = await requireViewer();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const current = await getProduct(id);
  if (!current) return { ok: false, errors: { form: "Product not found" } };
  const slug = current.name === parsed.data.name ? current.slug : await uniqueSlug(viewer.workspace.id, parsed.data.name, id);
  await db
    .update(schema.product)
    .set({ ...parsed.data, slug, updatedAt: new Date() })
    .where(and(eq(schema.product.workspaceId, viewer.workspace.id), eq(schema.product.id, id)));
  return { ok: true, value: { ...current, ...parsed.data, slug } };
}

export async function archiveProduct(id: string): Promise<void> {
  const viewer = await requireViewer();
  await db
    .update(schema.product)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.product.workspaceId, viewer.workspace.id), eq(schema.product.id, id)));
}

export async function addProductAsset(productId: string, input: { url: string; kind: string; name: string }): Promise<ProductAsset> {
  const viewer = await requireViewer();
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found");
  const url = String(input.url ?? "").trim();
  if (!/^https?:\/\//.test(url)) throw new Error("Invalid asset URL");
  if (product.assets.length >= 12) throw new Error("A product holds up to 12 photos");
  const asset = {
    id: newId(),
    productId,
    url,
    kind: input.kind === "video" ? ("video" as const) : ("image" as const),
    name: String(input.name ?? "").slice(0, 180),
    position: product.assets.length,
    createdAt: new Date(),
  };
  await db.insert(schema.productAsset).values(asset);
  await db.update(schema.product).set({ updatedAt: new Date() }).where(eq(schema.product.id, productId));
  void viewer;
  return toAsset(asset);
}

export async function removeProductAsset(productId: string, assetId: string): Promise<void> {
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found");
  await db.delete(schema.productAsset).where(and(eq(schema.productAsset.productId, productId), eq(schema.productAsset.id, assetId)));
}
