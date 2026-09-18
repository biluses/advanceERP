import type { Metadata } from "next";
import Link from "next/link";

import { listProducts } from "@/server/actions/products";
import { viewerOrRedirect } from "@/server/session";
import { CampaignForm } from "@/ui/campaign-form";

export const metadata: Metadata = { title: "New campaign" };
export const dynamic = "force-dynamic";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  await viewerOrRedirect();
  const [products, params] = await Promise.all([listProducts(), searchParams]);
  return (
    <div className="vt-page">
      <header className="vt-page-head">
        <div>
          <p className="vt-page-crumb">
            <Link href="/app/campaigns">Campaigns</Link>
          </p>
          <h1 className="vt-page-title">New campaign</h1>
        </div>
      </header>
      {products.length === 0 ? (
        <div className="vt-empty-card">
          <h2>Add a product first</h2>
          <p>A campaign is built around one product and its photos.</p>
          <Link href="/app/products/new" className="vt-btn-solid">
            Add a product
          </Link>
        </div>
      ) : (
        <CampaignForm products={products} initialProductId={params.product ?? null} />
      )}
    </div>
  );
}
