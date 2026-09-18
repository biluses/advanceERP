import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getViewer } from "@/server/session";
import { AuthForm } from "@/ui/auth-form";
import { AuthShell } from "@/ui/auth-shell";

export const metadata: Metadata = { title: "Create your studio" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getViewer()) redirect("/app");
  return (
    <AuthShell>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
