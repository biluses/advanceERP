import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { contentTypeFor, localPath } from "@/server/storage";

/** Serves locally stored uploads. Unauthenticated on purpose: the generation
    platform fetches these URLs with no session, and the path carries a random
    id in place of a guessable name. */
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const file = localPath(path);
  if (!file) return new NextResponse(null, { status: 404 });
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return new NextResponse(null, { status: 404 });
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentTypeFor(file),
      "Content-Length": String(info.size),
      /* Whatever bytes were uploaded, the browser treats them as the declared
         media type and never as a document. */
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
