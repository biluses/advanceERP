import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProduct } from "@/server/actions/products";
import { viewerOrRedirect } from "@/server/session";
import { ProductEditor } from "@/ui/product-editor";

export const metadata: Metadata = { title: "Product" };
export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await viewerOrRedirect();
  const { id } = await params;
  const product = id === "new" ? null : await getProduct(id);
  if (id !== "new" && !product) notFound();
  return (
    <div className="vt-page">
      <header className="vt-page-head">
        <div>
          <p className="vt-page-crumb">
            <Link href="/app/products">Products</Link>
          </p>
          <h1 className="vt-page-title">{product ? product.name : "New product"}</h1>
        </div>
        {product && (
          <Link href={`/app?product=${product.id}`} className="vt-btn-solid">
            Open in studio
          </Link>
        )}
      </header>
      <ProductEditor product={product} key={product?.id ?? "new"} />
    </div>
  );
}
