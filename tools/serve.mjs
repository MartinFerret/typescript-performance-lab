// Local server for the lab notebook, under the same path as in production:
//   node tools/serve.mjs, then open http://localhost:4173/typescript-performance-lab/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../docs");
const base = new URL(process.env.LAB_URL ?? "https://martinferret.dev/typescript-performance-lab/").pathname.replace(/\/?$/, "/");
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".xml": "application/xml" };
createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (!url.startsWith(base)) return res.writeHead(302, { location: base }).end();
  let file = path.join(site, url.slice(base.length));
  if (!file.startsWith(site)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(4173, () => console.log(`Lab notebook on http://localhost:4173${base}`));
