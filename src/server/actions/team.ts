"use server";

import { cookies } from "next/headers";

import { getPlan } from "@/domain/plans";
import { requireViewer, WORKSPACE_COOKIE, WORKSPACE_COOKIE_OPTIONS } from "@/server/session";
import {
  bootstrapWorkspace,
  createInvite,
  isMember,
  listMembers,
  listOpenInvites,
  removeMember,
  revokeInvite,
  seatsUsed,
  workspacesForUser,
  type Invite,
  type Member,
} from "@/server/workspaces";

export type TeamView = {
  members: Member[];
  invites: Invite[];
  seats: number;
  seatsUsed: number;
  canManage: boolean;
  ownerId: string;
};

export async function getTeam(): Promise<TeamView> {
  const viewer = await requireViewer();
  const [members, invites, used] = await Promise.all([
    listMembers(viewer.workspace.id),
    viewer.role === "owner" ? listOpenInvites(viewer.workspace.id) : Promise.resolve([]),
    seatsUsed(viewer.workspace.id),
  ]);
  return {
    members,
    invites,
    seats: getPlan(viewer.workspace.planId).seats,
    seatsUsed: used,
    canManage: viewer.role === "owner",
    ownerId: viewer.workspace.ownerId,
  };
}

async function requireOwner() {
  const viewer = await requireViewer();
  if (viewer.role !== "owner") throw new Error("Only the workspace owner can manage the team");
  return viewer;
}

export async function createInviteLink(role: "owner" | "editor" = "editor"): Promise<Invite> {
  const viewer = await requireOwner();
  const used = await seatsUsed(viewer.workspace.id);
  if (used >= getPlan(viewer.workspace.planId).seats) {
    throw new Error("Every seat on this plan is taken. Upgrade to invite more people.");
  }
  return createInvite(viewer.workspace.id, viewer.user.id, role);
}

export async function revokeInviteLink(inviteId: string): Promise<void> {
  const viewer = await requireOwner();
  await revokeInvite(viewer.workspace.id, inviteId);
}

export async function removeTeamMember(userId: string): Promise<void> {
  const viewer = await requireOwner();
  await removeMember(viewer.workspace.id, userId);
}

export type WorkspaceOption = { id: string; name: string; role: "owner" | "editor" };

export async function listMyWorkspaces(): Promise<WorkspaceOption[]> {
  const viewer = await requireViewer();
  const rows = await workspacesForUser(viewer.user.id);
  return rows.map((row) => ({ id: row.workspace.id, name: row.workspace.name, role: row.role }));
}

/** Makes another of the member's workspaces the one on screen. */
export async function switchWorkspace(workspaceId: string): Promise<void> {
  const viewer = await requireViewer();
  if (!(await isMember(workspaceId, viewer.user.id))) throw new Error("Not a member of that workspace");
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, workspaceId, WORKSPACE_COOKIE_OPTIONS);
}

/** A second brand under the same account: its own kit, products, runs and
    credits, no trial the second time around. */
export async function createWorkspace(name: string): Promise<{ id: string }> {
  const viewer = await requireViewer();
  const clean = String(name ?? "").trim();
  if (!clean) throw new Error("Give the workspace a name");
  const id = await bootstrapWorkspace(viewer.user, { name: clean.slice(0, 80), trial: false });
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, id, WORKSPACE_COOKIE_OPTIONS);
  return { id };
}
