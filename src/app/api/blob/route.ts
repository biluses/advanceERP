import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { getViewer } from "@/server/session";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, sanitizeFilename } from "@/server/storage";

/** Vercel Blob driver: issues a scoped client token so the browser uploads
    straight to the store. Only a signed-in member gets one, and every file is
    filed under the workspace. */
export async function POST(request: Request): Promise<NextResponse> {
  const incoming = (await request.json()) as HandleUploadBody;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: "Blob storage is not configured" }, { status: 500 });

  if (incoming.type === "blob.generate-client-token") {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to upload" }, { status: 401 });
    const pathname = `${viewer.workspace.id}/${sanitizeFilename(incoming.payload.pathname)}`;
    const body: HandleUploadBody = { ...incoming, payload: { ...incoming.payload, pathname } };
    try {
      const json = await handleUpload({
        body,
        request,
        token,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        }),
      });
      return NextResponse.json({ ...json, pathname });
    } catch (error) {
      console.error("[blob] token failed", error instanceof Error ? error.message : error);
      return NextResponse.json({ error: "Could not start the upload" }, { status: 500 });
    }
  }

  /* Upload-completed callbacks arrive from Vercel, not the browser; the shelf
     is written by the client action instead, so nothing is needed here. */
  try {
    const json = await handleUpload({ body: incoming, request, token, onBeforeGenerateToken: async () => ({}) });
    return NextResponse.json(json);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
