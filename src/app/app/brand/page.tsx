import type { Metadata } from "next";

import { getBrandKit } from "@/server/actions/brand";
import { BrandEditor } from "@/ui/brand-editor";

export const metadata: Metadata = { title: "Brand kit" };
export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const brand = await getBrandKit();
  return (
    <div className="vt-page">
      <header className="vt-page-head">
        <div>
          <h1 className="vt-page-title">Brand kit</h1>
          <p className="vt-page-copy">Written once, folded into every prompt the studio sends.</p>
        </div>
      </header>
      <BrandEditor brand={brand} />
    </div>
  );
}
