import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getViewer } from "@/server/session";
import { Sidebar } from "@/ui/sidebar";

import "@/studio/studio.css";
import "@/ui/app.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-vt-inter", display: "swap" });

/* Everything under /app is behind the session. The check lives here rather
   than in a proxy so every page gets the viewer for free and a missing
   session lands on the sign-in page with the way back. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return (
    <div className={`vt vt-app ${inter.variable}`}>
      <Sidebar
        workspaceName={viewer.workspace.name}
        planId={viewer.workspace.planId}
        credits={viewer.workspace.creditBalance}
        byok={Boolean(viewer.workspace.platformKeySealed)}
        userName={viewer.user.name || viewer.user.email}
      />
      <div className="vt-app-main">{children}</div>
    </div>
  );
}
