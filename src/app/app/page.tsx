import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getViewer } from "@/server/session";
import { loadStudioData } from "@/server/studio-data";
import { StudioApp } from "@/studio/studio-app";

export const metadata: Metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const data = await loadStudioData(viewer);
  return <StudioApp data={data} />;
}
