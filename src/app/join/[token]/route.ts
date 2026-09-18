import { NextResponse } from "next/server";

import { getViewer, WORKSPACE_COOKIE, WORKSPACE_COOKIE_OPTIONS } from "@/server/session";
import { acceptInvite, InviteError } from "@/server/workspaces";

/** The landing for an invitation link. Signed out, it sends the visitor to
    create an account and comes back here; signed in, it joins them, makes
    the workspace current and opens the studio. A route handler rather than a
    page because spending the token and setting the cookie are writes, and a
    page render can be retried. */
export async function GET(request: Request, context: { params: Promise<{ token: string }> }): Promise<NextResponse> {
  const { token } = await context.params;
  const origin = new URL(request.url).origin;
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.redirect(`${origin}/register?next=${encodeURIComponent(`/join/${token}`)}`);
  }
  try {
    const workspaceId = await acceptInvite(token, viewer.user.id);
    const response = NextResponse.redirect(`${origin}/app`);
    response.cookies.set(WORKSPACE_COOKIE, workspaceId, WORKSPACE_COOKIE_OPTIONS);
    return response;
  } catch (caught) {
    const code = caught instanceof InviteError ? caught.code : "unknown";
    return NextResponse.redirect(`${origin}/join/failed?code=${code}`);
  }
}
