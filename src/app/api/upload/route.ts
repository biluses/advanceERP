import { NextResponse } from "next/server";

import { getViewer } from "@/server/session";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, publicOrigin, storeLocal } from "@/server/storage";

/** Local storage driver: the browser posts the file here and gets back a URL
    under /api/files the platform can fetch. */
export async function POST(request: Request): Promise<NextResponse> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to upload" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type ${file.type || "(unknown)"}` }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is larger than 64 MB" }, { status: 413 });
  }
  const path = await storeLocal(viewer.workspace.id, file.name, new Uint8Array(await file.arrayBuffer()));
  return NextResponse.json({ url: `${publicOrigin(request)}/api/files/${path}` });
}
