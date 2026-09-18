import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { mailConfigured } from "@/server/mail";
import { getViewer } from "@/server/session";
import { AuthForm } from "@/ui/auth-form";
import { AuthShell } from "@/ui/auth-shell";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

/** Only same-origin paths may be a return target. */
function safeNext(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getViewer()) redirect(next);
  return (
    <AuthShell>
      <AuthForm mode="login" next={next} canReset={mailConfigured()} />
    </AuthShell>
  );
}
