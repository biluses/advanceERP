import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { mailConfigured } from "@/server/mail";
import { getViewer } from "@/server/session";
import { AuthShell } from "@/ui/auth-shell";
import { ForgotPasswordForm } from "@/ui/password-forms";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  if (await getViewer()) redirect("/app");
  return (
    <AuthShell>
      {mailConfigured() ? (
        <ForgotPasswordForm />
      ) : (
        <div className="vt-auth-form">
          <h1 className="vt-auth-title">Reset not available</h1>
          <p className="vt-auth-copy">This studio has no email sender configured, so passwords cannot be reset by link. Ask the operator.</p>
          <Link href="/login" className="vt-cta vt-auth-submit">
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
