import type { BrandKit, Product } from "@/domain/brand";
import type { KeyStatus } from "@/generation/actions";
import type { UploadRecord } from "@/server/actions/uploads";
import type { RunRecord as ServerRunRecord } from "@/server/runs";

/** Everything the studio needs on first paint, loaded by the page on the
    server so the grid opens full rather than empty-then-filled. */
export type StudioData = {
  runs: ServerRunRecord[];
  /** Older runs exist beyond the first page. */
  hasMore: boolean;
  uploads: UploadRecord[];
  products: Product[];
  brand: BrandKit;
  key: KeyStatus;
  credits: number;
  planId: string;
  workspaceName: string;
};

export type ReviewFilter = "all" | "pending" | "approved" | "rejected";
