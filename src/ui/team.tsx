"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { TeamView, WorkspaceOption } from "@/server/actions/team";
import { createInviteLink, createWorkspace, removeTeamMember, revokeInviteLink, switchWorkspace } from "@/server/actions/team";

export function TeamPanel({ team, origin, currentUserId }: { team: TeamView; origin: string; currentUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function copy(token: string) {
    const url = `${origin}/join/${token}`;
    void navigator.clipboard.writeText(url).then(
      () => setCopied(token),
      () => setCopied(null),
    );
  }

  const full = team.seatsUsed >= team.seats;

  return (
    <section className="vt-panel">
      <header className="vt-panel-head vt-panel-head--row">
        <div>
          <h2 className="vt-panel-title">Team</h2>
          <p className="vt-panel-copy">
            {team.seatsUsed} of {team.seats} seat{team.seats === 1 ? "" : "s"} used on this plan.
          </p>
        </div>
        {team.canManage && (
          <button type="button" className="vt-btn-solid" disabled={busy || full} title={full ? "Every seat is taken" : undefined} onClick={() => void run(() => createInviteLink("editor"))}>
            New invite link
          </button>
        )}
      </header>

      <ul className="vt-members">
        {team.members.map((member) => (
          <li key={member.userId} className="vt-member">
            <span className="vt-member-name">
              {member.name || member.email}
              {member.userId === currentUserId ? <em> · you</em> : null}
            </span>
            <span className="vt-member-email">{member.email}</span>
            <span className="vt-chip">{member.userId === team.ownerId ? "owner" : member.role}</span>
            {team.canManage && member.userId !== team.ownerId && (
              <button type="button" className="vt-btn-quiet vt-btn-danger" disabled={busy} onClick={() => void run(() => removeTeamMember(member.userId))}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {team.canManage && team.invites.length > 0 && (
        <ul className="vt-members vt-members--invites">
          {team.invites.map((invite) => (
            <li key={invite.id} className="vt-member">
              <code className="vt-member-link">{`${origin}/join/${invite.token}`}</code>
              <button type="button" className="vt-btn-quiet" onClick={() => copy(invite.token)}>
                {copied === invite.token ? "Copied" : "Copy link"}
              </button>
              <button type="button" className="vt-btn-quiet vt-btn-danger" disabled={busy} onClick={() => void run(() => revokeInviteLink(invite.id))}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      {team.canManage && <p className="vt-panel-note">Links work for 14 days and seat one person each. Whoever opens one signs up and lands in this workspace.</p>}

      {error && (
        <div className="vt-alert" role="alert">
          <span className="vt-alert-text">{error}</span>
        </div>
      )}
    </section>
  );
}

export function WorkspacePanel({ workspaces, currentId }: { workspaces: WorkspaceOption[]; currentId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, then: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      then();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="vt-panel">
      <header className="vt-panel-head">
        <h2 className="vt-panel-title">Workspaces</h2>
        <p className="vt-panel-copy">One workspace per brand: its own kit, products, runs and credits.</p>
      </header>
      <ul className="vt-members">
        {workspaces.map((workspace) => (
          <li key={workspace.id} className="vt-member">
            <span className="vt-member-name">{workspace.name}</span>
            <span className="vt-chip">{workspace.role}</span>
            {workspace.id === currentId ? (
              <span className="vt-chip vt-chip--dim">current</span>
            ) : (
              <button
                type="button"
                className="vt-btn-quiet"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => switchWorkspace(workspace.id),
                    () => {
                      router.push("/app");
                      router.refresh();
                    },
                  )
                }
              >
                Switch
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="vt-form-row"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () => createWorkspace(name),
            () => {
              setName("");
              router.push("/app/brand");
              router.refresh();
            },
          );
        }}
      >
        <input className="vt-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="New brand name" maxLength={80} />
        <button type="submit" className="vt-btn-solid" disabled={busy || !name.trim()}>
          Create workspace
        </button>
      </form>
      {error && (
        <div className="vt-alert" role="alert">
          <span className="vt-alert-text">{error}</span>
        </div>
      )}
    </section>
  );
}
