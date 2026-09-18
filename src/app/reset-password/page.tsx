import type { Metadata } from "next";

import { AuthShell } from "@/ui/auth-shell";
import { ResetPasswordForm } from "@/ui/password-forms";

export const metadata: Metadata = { title: "New password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell>
      <ResetPasswordForm token={params.error ? null : (params.token ?? null)} />
    </AuthShell>
  );
}
