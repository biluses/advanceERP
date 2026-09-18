import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/ui/auth-shell";

export const metadata: Metadata = { title: "Invitation not usable" };

const REASONS: Record<string, string> = {
  unknown: "This invitation does not exist.",
  expired: "This invitation has expired or was already used.",
  full: "This workspace has no seats left on its plan. Ask the owner to upgrade and send a new link.",
};

export default async function JoinFailedPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <AuthShell>
      <div className="vt-auth-form">
        <h1 className="vt-auth-title">Invitation not usable</h1>
        <p className="vt-auth-copy">{REASONS[code ?? ""] ?? REASONS.unknown}</p>
        <Link href="/app" className="vt-cta vt-auth-submit">
          Go to your studio
        </Link>
      </div>
    </AuthShell>
  );
}
