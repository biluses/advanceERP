import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getViewer } from "@/server/session";
import { AuthForm } from "@/ui/auth-form";
import { AuthShell } from "@/ui/auth-shell";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getViewer()) redirect("/app");
  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}
