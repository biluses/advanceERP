import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { platformKeyStatus } from "@/generation/actions";
import { readBrandKit } from "@/server/actions/brand";
import { getCampaign } from "@/server/actions/campaigns";
import { getProduct } from "@/server/actions/products";
import { listRuns } from "@/server/runs";
import { getViewer } from "@/server/session";
import { CampaignView } from "@/ui/campaign-view";

export const metadata: Metadata = { title: "Campaign" };
export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const [product, brand, runs, key] = await Promise.all([
    getProduct(campaign.productId),
    readBrandKit(viewer.workspace.id),
    listRuns(viewer.workspace.id),
    platformKeyStatus(),
  ]);
  if (!product) notFound();
  return (
    <CampaignView
      campaign={campaign}
      product={product}
      brand={brand}
      runs={runs.filter((run) => run.campaignId === campaign.id)}
      credits={viewer.workspace.creditBalance}
      keyStatus={key}
    />
  );
}
