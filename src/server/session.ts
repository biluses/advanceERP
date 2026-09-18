import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth/auth";
import type { Workspace } from "@/db/schema";

import { workspaceForUser } from "./workspaces";

export class UnauthorizedError extends Error {
  constructor() {
    super("Sign in to continue");
    this.name = "UnauthorizedError";
  }
}

export type Viewer = {
  user: { id: string; name: string; email: string };
  workspace: Workspace;
  role: "owner" | "editor";
};

/** Remembers which of a member's workspaces is on screen. */
export const WORKSPACE_COOKIE = "vt_workspace";

export const WORKSPACE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

/** The signed-in user and the workspace they act in, read once per request.
    Every server action and page goes through here, so a request without a
    session cannot reach a query. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const jar = await cookies();
  const { workspace, role } = await workspaceForUser(session.user.id, jar.get(WORKSPACE_COOKIE)?.value);
  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    workspace,
    role,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new UnauthorizedError();
  return viewer;
}

/** For pages: a missing session goes to sign-in instead of an error. Layouts
    and pages render concurrently, so every page under /app asks for itself
    rather than relying on the layout's redirect landing first. */
export async function viewerOrRedirect(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
