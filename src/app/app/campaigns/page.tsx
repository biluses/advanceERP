import type { Metadata } from "next";
import Link from "next/link";

import { getChannel } from "@/domain/channels";
import { findPreset } from "@/domain/presets";
import { listCampaigns } from "@/server/actions/campaigns";
import { listProducts } from "@/server/actions/products";

export const metadata: Metadata = { title: "Campaigns" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [campaigns, products] = await Promise.all([listCampaigns(), listProducts()]);
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? "Archived product";
  return (
    <div className="vt-page">
      <header className="vt-page-head">
        <div>
          <h1 className="vt-page-title">Campaigns</h1>
          <p className="vt-page-copy">One product, a set of presets, the channels it ships to — generated together, exported as one folder.</p>
        </div>
        <Link href="/app/campaigns/new" className="vt-cta">
          New campaign
        </Link>
      </header>

      {campaigns.length === 0 ? (
        <div className="vt-empty-card">
          <h2>No campaigns yet</h2>
          <p>{products.length === 0 ? "Add a product first, then build a campaign around it." : "Pick a product, choose presets and channels, and generate the whole set in one press."}</p>
          <Link href={products.length === 0 ? "/app/products/new" : "/app/campaigns/new"} className="vt-btn-solid">
            {products.length === 0 ? "Add a product" : "Create a campaign"}
          </Link>
        </div>
      ) : (
        <ul className="vt-list">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link href={`/app/campaigns/${campaign.id}`} className="vt-row">
                <span className="vt-row-title">{campaign.name}</span>
                <span className="vt-row-meta">{productName(campaign.productId)}</span>
                <span className="vt-row-chips">
                  {campaign.presetIds.map((id) => (
                    <span key={id} className="vt-chip">
                      {findPreset(id)?.label ?? id}
                    </span>
                  ))}
                  {campaign.channelIds.map((id) => (
                    <span key={id} className="vt-chip vt-chip--dim">
                      {getChannel(id).label}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
