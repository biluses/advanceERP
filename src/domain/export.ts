import { slugify } from "./brand";

export type ExportItem = {
  brand: string;
  product: string;
  channelTag: string | null;
  presetId: string | null;
  url: string;
  kind: "image" | "video";
  index: number;
};

/** The path a run takes inside a campaign export. Folders by product and
    channel, because that is how a marketing team hands assets over: "the
    Amazon set", "the Story set". */
export function exportPath(item: ExportItem): string {
  const ext = extensionOf(item.url) ?? (item.kind === "video" ? "mp4" : "png");
  const folder = [slugify(item.brand, "brand"), slugify(item.product, "product"), item.channelTag ?? "studio"].join("/");
  const name = `${item.presetId ?? "run"}-${String(item.index + 1).padStart(2, "0")}.${ext}`;
  return `${folder}/${name}`;
}

export function extensionOf(url: string): string | null {
  const match = /\.([a-z0-9]{2,4})(?:[?#]|$)/i.exec(url);
  return match ? match[1]!.toLowerCase() : null;
}
