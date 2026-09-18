import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { platformKeyStatus } from "@/generation/actions";
import { readBrandKit } from "@/server/actions/brand";
import { getCampaign } from "@/server/actions/campaigns";
import { getProduct } from "@/server/actions/products";
import { listCampaignRuns } from "@/server/runs";
import { viewerOrRedirect } from "@/server/session";
import { CampaignView } from "@/ui/campaign-view";

export const metadata: Metadata = { title: "Campaign" };
export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await viewerOrRedirect();
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const [product, brand, runs, key] = await Promise.all([
    getProduct(campaign.productId),
    readBrandKit(viewer.workspace.id),
    listCampaignRuns(viewer.workspace.id, campaign.id),
    platformKeyStatus(),
  ]);
  if (!product) notFound();
  return (
    <CampaignView
      campaign={campaign}
      product={product}
      brand={brand}
      runs={runs}
      credits={viewer.workspace.creditBalance}
      keyStatus={key}
    />
  );
}
