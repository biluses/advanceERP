"use client";

import type { Product } from "@/domain/brand";

import type { ReviewFilter } from "./types";

const REVIEW: ReadonlyArray<{ id: ReviewFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "To review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

/** Narrows the grid to one product and one review state — the two cuts a
    team actually makes when handing work over. */
export function Filters({
  products,
  productId,
  review,
  onProduct,
  onReview,
}: {
  products: Product[];
  productId: string | null;
  review: ReviewFilter;
  onProduct: (id: string | null) => void;
  onReview: (next: ReviewFilter) => void;
}) {
  return (
    <div className="vt-filters vt-enter-1">
      <label className="vt-filter-select">
        <span className="vt-sr">Product</span>
        <select value={productId ?? ""} onChange={(event) => onProduct(event.target.value || null)} aria-label="Filter by product">
          <option value="">All products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </label>
      <div className="vt-seg" role="group" aria-label="Review state">
        {REVIEW.map((option) => (
          <button
            key={option.id}
            type="button"
            className="vt-seg-btn"
            aria-pressed={review === option.id}
            onClick={() => onReview(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
