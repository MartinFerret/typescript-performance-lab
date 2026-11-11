// Tiny static server for the lab notebook: node tools/serve.mjs, then open http://localhost:4173
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../docs");
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
createServer(async (req, res) => {
  const file = path.join(site, req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(site)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(4173, () => console.log("Lab notebook on http://localhost:4173"));
