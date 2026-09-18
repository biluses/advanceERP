/* Grants credits to a workspace by owner email — the self-hosted operator's
   substitute for Stripe. Usage: pnpm credits owner@example.com 500 ["note"] */
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const [email, amountText, note = "manual grant"] = process.argv.slice(2);
const amount = Number(amountText);
if (!email || !Number.isInteger(amount) || amount === 0) {
  console.error("usage: pnpm credits <owner-email> <credits> [note]");
  process.exit(1);
}
const url = process.env.DATABASE_URL?.trim() || process.env.TURSO_DATABASE_URL?.trim() || "file:./data/vitrina.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
const user = await client.execute({ sql: "select id from user where email = ?", args: [email] });
const userId = user.rows[0]?.id;
if (!userId) {
  console.error(`no user with email ${email}`);
  process.exit(1);
}
const ws = await client.execute({ sql: "select workspace_id from membership where user_id = ? order by created_at limit 1", args: [userId] });
const workspaceId = ws.rows[0]?.workspace_id;
if (!workspaceId) {
  console.error("user has no workspace");
  process.exit(1);
}
const now = Date.now();
await client.batch(
  [
    { sql: "insert into credit_ledger (id, workspace_id, delta, reason, note, created_at) values (?, ?, ?, 'adjustment', ?, ?)", args: [randomUUID(), workspaceId, amount, note, now] },
    { sql: "update workspace set credit_balance = credit_balance + ?, updated_at = ? where id = ?", args: [amount, now, workspaceId] },
  ],
  "write",
);
const after = await client.execute({ sql: "select credit_balance from workspace where id = ?", args: [workspaceId] });
console.log(`[credits] ${amount > 0 ? "+" : ""}${amount} → balance ${after.rows[0]?.credit_balance}`);
client.close();
