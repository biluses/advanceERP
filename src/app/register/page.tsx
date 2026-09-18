import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
  return (
    <AuthShell>
      <AuthForm mode="register" next={next} />
    </AuthShell>
  );
}
