import type { Metadata } from "next";

import { platformKeyStatus } from "@/generation/actions";
import { getWorkspaceSummary, listLedger } from "@/server/actions/billing";
import { getTeam, listMyWorkspaces } from "@/server/actions/team";
import { viewerOrRedirect } from "@/server/session";
import { KeyPanel, LedgerPanel, PlanPanel } from "@/ui/settings";
import { TeamPanel, WorkspacePanel } from "@/ui/team";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const viewer = await viewerOrRedirect();
  const [summary, key, ledger, team, workspaces, params] = await Promise.all([
    getWorkspaceSummary(),
    platformKeyStatus(),
    listLedger(),
    getTeam(),
    listMyWorkspaces(),
    searchParams,
  ]);
  const origin = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
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
        <TeamPanel team={team} origin={origin} currentUserId={viewer.user.id} />
        <WorkspacePanel workspaces={workspaces} currentId={viewer.workspace.id} />
        <LedgerPanel entries={ledger} />
      </div>
    </div>
  );
}
