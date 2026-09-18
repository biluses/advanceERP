import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/* ---------- better-auth ---------- */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

/* ---------- workspace ---------- */

export const workspace = sqliteTable(
  "workspace",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull().default("free"),
    /** Cached sum of the ledger, kept in the same transaction as every entry. */
    creditBalance: integer("credit_balance").notNull().default(0),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    /** Unix ms of the current period's end, from the subscription. */
    planRenewsAt: integer("plan_renews_at", { mode: "timestamp_ms" }),
    /** Bring-your-own-key: the platform key, AES-GCM sealed with APP_SECRET. */
    platformKeySealed: text("platform_key_sealed"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("workspace_owner_idx").on(table.ownerId)],
);

export const membership = sqliteTable(
  "membership",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor"] }).notNull().default("editor"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] }), index("membership_user_idx").on(table.userId)],
);

export const brandKit = sqliteTable("brand_kit", {
  workspaceId: text("workspace_id")
    .primaryKey()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  tone: text("tone").notNull().default(""),
  style: text("style").notNull().default(""),
  palette: text("palette", { mode: "json" }).$type<string[]>().notNull().default([]),
  audience: text("audience").notNull().default(""),
  avoid: text("avoid").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const product = sqliteTable(
  "product",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: text("category").notNull().default("Other"),
    description: text("description").notNull().default(""),
    features: text("features", { mode: "json" }).$type<string[]>().notNull().default([]),
    appearance: text("appearance").notNull().default(""),
    audience: text("audience").notNull().default(""),
    priceLabel: text("price_label").notNull().default(""),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("product_workspace_idx").on(table.workspaceId),
    uniqueIndex("product_workspace_slug_idx").on(table.workspaceId, table.slug),
  ],
);

export const productAsset = sqliteTable(
  "product_asset",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    kind: text("kind", { enum: ["image", "video"] }).notNull().default("image"),
    name: text("name").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("product_asset_product_idx").on(table.productId)],
);

export const upload = sqliteTable(
  "upload",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    kind: text("kind", { enum: ["image", "video", "audio"] }).notNull().default("image"),
    name: text("name").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("upload_workspace_idx").on(table.workspaceId)],
);

export const campaign = sqliteTable(
  "campaign",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    scene: text("scene").notNull().default(""),
    presetIds: text("preset_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    channelIds: text("channel_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("campaign_workspace_idx").on(table.workspaceId)],
);

export const run = sqliteTable(
  "run",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** Platform request. One request can deliver several rows (a batch). */
    requestId: text("request_id").notNull(),
    productId: text("product_id").references(() => product.id, { onDelete: "set null" }),
    campaignId: text("campaign_id").references(() => campaign.id, { onDelete: "set null" }),
    presetId: text("preset_id"),
    channelId: text("channel_id"),
    surface: text("surface", { enum: ["image", "video"] }).notNull(),
    modelId: text("model_id").notNull(),
    modelLabel: text("model_label").notNull(),
    prompt: text("prompt").notNull(),
    scene: text("scene").notNull().default(""),
    ratio: text("ratio").notNull(),
    meta: text("meta").notNull().default(""),
    badge: text("badge"),
    urls: text("urls", { mode: "json" }).$type<string[]>().notNull().default([]),
    status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
    error: text("error"),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    review: text("review", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    settings: text("settings", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    credits: integer("credits").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("run_workspace_created_idx").on(table.workspaceId, table.createdAt),
    index("run_request_idx").on(table.requestId),
    index("run_campaign_idx").on(table.campaignId),
  ],
);

export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason", {
      enum: ["trial", "plan_grant", "purchase", "generation", "refund", "adjustment"],
    }).notNull(),
    requestId: text("request_id"),
    stripeEventId: text("stripe_event_id"),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("ledger_workspace_idx").on(table.workspaceId, table.createdAt),
    uniqueIndex("ledger_request_reason_idx").on(table.requestId, table.reason),
  ],
);

/** Every Stripe event handled, so a redelivered webhook is a no-op. */
export const stripeEvent = sqliteTable("stripe_event", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp_ms" }).notNull(),
});

export type Workspace = typeof workspace.$inferSelect;
export type ProductRow = typeof product.$inferSelect;
export type ProductAssetRow = typeof productAsset.$inferSelect;
export type RunRow = typeof run.$inferSelect;
export type CampaignRow = typeof campaign.$inferSelect;
export type UploadRow = typeof upload.$inferSelect;
export type BrandKitRow = typeof brandKit.$inferSelect;
