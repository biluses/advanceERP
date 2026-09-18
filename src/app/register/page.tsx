import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signupsClosed } from "@/auth/auth";
import { getViewer } from "@/server/session";
import { AuthForm } from "@/ui/auth-form";
import { AuthShell } from "@/ui/auth-shell";

export const metadata: Metadata = { title: "Create your studio" };
export const dynamic = "force-dynamic";

/** Only same-origin paths may be a return target. */
function safeNext(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getViewer()) redirect(next);
  if (signupsClosed()) {
    return (
      <AuthShell>
        <div className="vt-auth-form">
          <h1 className="vt-auth-title">Sign-ups are closed</h1>
          <p className="vt-auth-copy">This studio seats people by invitation. Ask the operator for a link, or sign in if you already have an account.</p>
          <Link href="/login" className="vt-cta vt-auth-submit">
            Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell>
      <AuthForm mode="register" next={next} />
    </AuthShell>
  );
}
