import type { Metadata } from "next";
import Link from "next/link";

import { listProducts } from "@/server/actions/products";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <div className="vt-page">
      <header className="vt-page-head">
        <div>
          <h1 className="vt-page-title">Products</h1>
          <p className="vt-page-copy">Every product carries its photos and the words the prompts are built from.</p>
        </div>
        <Link href="/app/products/new" className="vt-cta">
          New product
        </Link>
      </header>

      {products.length === 0 ? (
        <div className="vt-empty-card">
          <h2>No products yet</h2>
          <p>Add your first product — a name, how it looks, and a photo — and the studio does the rest.</p>
          <Link href="/app/products/new" className="vt-btn-solid">
            Add a product
          </Link>
        </div>
      ) : (
        <ul className="vt-cards">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/app/products/${product.id}`} className="vt-card vt-card--product">
                <span className="vt-card-thumb">
                  {product.assets[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={product.assets[0].url} alt="" />
                  ) : (
                    <span className="vt-card-thumb-empty">No photo</span>
                  )}
                </span>
                <span className="vt-card-body">
                  <span className="vt-card-title">{product.name}</span>
                  <span className="vt-card-meta">
                    {product.category !== "Other" ? `${product.category} · ` : ""}
                    {product.assets.length} photo{product.assets.length === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
