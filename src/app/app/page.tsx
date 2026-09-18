import type { Metadata } from "next";

import { viewerOrRedirect } from "@/server/session";
import { loadStudioData } from "@/server/studio-data";
import { StudioApp } from "@/studio/studio-app";

export const metadata: Metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const viewer = await viewerOrRedirect();
  const data = await loadStudioData(viewer);
  return <StudioApp data={data} />;
}
