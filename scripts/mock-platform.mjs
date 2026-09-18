/* A stand-in for the generation platform, for development and end-to-end
   tests. Speaks the two calls the studio makes — POST /{model} and
   GET /requests/{id}/status — and answers every run with a placeholder
   image or clip after a short delay. Start with: pnpm mock:platform */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PLATFORM_PORT ?? 4010);
const DELAY_MS = Number(process.env.MOCK_PLATFORM_DELAY_MS ?? 1500);
const requests = new Map();

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const origin = `http://localhost:${PORT}`;

  if (req.method === "GET" && url.pathname.startsWith("/media/")) {
    const isVideo = url.pathname.endsWith(".mp4");
    res.writeHead(200, { "content-type": isVideo ? "video/mp4" : "image/png", "access-control-allow-origin": "*" });
    res.end(Buffer.from(PNG, "base64"));
    return;
  }

  const status = /^\/requests\/([^/]+)\/status$/.exec(url.pathname);
  if (req.method === "GET" && status) {
    const entry = requests.get(status[1]);
    if (!entry) return json(res, 404, { detail: "Unknown request" });
    if (Date.now() < entry.readyAt) return json(res, 200, { request_id: entry.id, status: "in_progress" });
    if (entry.fail) return json(res, 200, { request_id: entry.id, status: "failed", error: "mock platform failure" });
    if (entry.kind === "video") {
      return json(res, 200, { request_id: entry.id, status: "completed", video: { url: `${origin}/media/${entry.id}.mp4` } });
    }
    const images = Array.from({ length: entry.count }, (_, index) => ({ url: `${origin}/media/${entry.id}-${index}.png` }));
    return json(res, 200, { request_id: entry.id, status: "completed", images });
  }

  if (req.method === "POST") {
    if (!/^Key [^:]+:.+$/.test(req.headers.authorization ?? "")) return json(res, 401, { detail: "Missing key" });
    const body = await readBody(req);
    const model = url.pathname.slice(1);
    const id = `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const kind = /video|seedance|kling|wan|ltx|hailuo|pixverse|dop|happy-horse|minimax/.test(model) ? "video" : "image";
    const count = Number(body.batch_size ?? body.num_images ?? 1) || 1;
    const fail = typeof body.prompt === "string" && body.prompt.includes("MOCK_FAIL");
    requests.set(id, { id, kind, count, fail, readyAt: Date.now() + DELAY_MS });
    console.log(`[mock] ${model} → ${id} (${kind}${fail ? ", will fail" : ""})`);
    return json(res, 200, { request_id: id, status: "queued", status_url: `${origin}/requests/${id}/status`, cancel_url: "" });
  }

  json(res, 404, { detail: "Not found" });
});

server.listen(PORT, () => console.log(`[mock] platform listening on http://localhost:${PORT}`));
