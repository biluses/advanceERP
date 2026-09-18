import type { Metadata } from "next";

import { platformKeyStatus } from "@/generation/actions";
import { getWorkspaceSummary, listLedger } from "@/server/actions/billing";
import { requireViewer } from "@/server/session";
import { KeyPanel, LedgerPanel, PlanPanel } from "@/ui/settings";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [viewer, summary, key, ledger, params] = await Promise.all([
    requireViewer(),
    getWorkspaceSummary(),
    platformKeyStatus(),
    listLedger(),
    searchParams,
  ]);
  return (
    <div className="vt-page">
      <header className="vt-page-head">
        <div>
          <h1 className="vt-page-title">Settings</h1>
          <p className="vt-page-copy">
            {viewer.workspace.name} · {viewer.user.email}
          </p>
        </div>
      </header>
      <div className="vt-panels">
        <PlanPanel summary={summary} canEdit={viewer.role === "owner"} checkout={params.checkout ?? null} />
        <KeyPanel initial={key} />
        <LedgerPanel entries={ledger} />
      </div>
    </div>
  );
}
