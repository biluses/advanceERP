import { zipSync } from "fflate";

import { exportPath, type ExportItem } from "@/domain/export";

export type ExportProgress = { done: number; total: number };

/** Fetches every file and hands back one zip, filed by brand, product and
    channel. Reads go through the platform CDN's CORS policy, so a refusal is
    reported per file rather than sinking the whole export. */
export async function buildExport(
  items: ExportItem[],
  onProgress?: (progress: ExportProgress) => void,
): Promise<{ blob: Blob; refused: string[] }> {
  const files: Record<string, Uint8Array> = {};
  const refused: string[] = [];
  const seen = new Map<string, number>();
  let done = 0;
  for (const item of items) {
    let path = exportPath(item);
    const count = seen.get(path) ?? 0;
    seen.set(path, count + 1);
    if (count > 0) path = path.replace(/(\.[a-z0-9]+)$/i, `-${count + 1}$1`);
    try {
      const response = await fetch(item.url, { mode: "cors" });
      if (!response.ok) throw new Error(String(response.status));
      files[path] = new Uint8Array(await response.arrayBuffer());
    } catch {
      refused.push(path);
    }
    done++;
    onProgress?.({ done, total: items.length });
  }
  const zipped = zipSync(files, { level: 0 });
  return { blob: new Blob([zipped as BlobPart], { type: "application/zip" }), refused };
}

export function saveBlob(blob: Blob, name: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
