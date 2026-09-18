import { operatorKey } from "@/generation/credentials";
import type { StudioData } from "@/studio/types";

import { readBrandKit } from "./actions/brand";
import { listProducts } from "./actions/products";
import { listUploads } from "./actions/uploads";
import { listRuns } from "./runs";
import type { Viewer } from "./session";

/** One read per studio page load, on the server, so the grid opens full. */
export async function loadStudioData(viewer: Viewer): Promise<StudioData> {
  const [page, uploads, products, brand] = await Promise.all([
    listRuns(viewer.workspace.id),
    listUploads(),
    listProducts(),
    readBrandKit(viewer.workspace.id),
  ]);
  const byok = Boolean(viewer.workspace.platformKeySealed);
  return {
    runs: page.runs,
    hasMore: page.hasMore,
    uploads,
    products,
    brand,
    key: { mode: byok ? "byok" : operatorKey() ? "operator" : "none", byok, canEdit: viewer.role === "owner" },
    credits: viewer.workspace.creditBalance,
    planId: viewer.workspace.planId,
    workspaceName: viewer.workspace.name,
  };
}
