// Static pages of the lab notebook, written at build by tools/build-index.mjs.
// Every page is complete HTML (question, verdict, numbers, tables): JavaScript only adds interactions.
// The notebook's URL has one source: LAB_URL (default https://martinferret.dev/typescript-performance-lab/).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import * as app from "./app.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docs = path.join(root, "docs");
export const LAB_URL = new URL(process.env.LAB_URL ?? "https://martinferret.dev/typescript-performance-lab/");
export const BASE = LAB_URL.pathname.replace(/\/?$/, "/");
const SITE = new URL("/", LAB_URL); // Martin's personal site, at the root of the same domain
const abs = (p) => new URL(p.replace(/^\//, ""), LAB_URL).toString();
const personRef = { "@id": new URL("/#person", SITE).toString() };

const clip = (t, n) => (t.length <= n ? t : t.slice(0, n).replace(/\s\S*$/, "") + "...");
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The pages: overview, one per experiment, method. */
export function pages(data) {
  const ex = data.experiments.slice().sort((a, b) => a.id.localeCompare(b.id));
  return [
    { page: "home", path: "", og: "home", title: "TypeScript Performance Lab: measured, not guessed",
      description: "Reproducible experiments on how fast TypeScript checks your types: TypeScript 6 vs 7, memory and slow type patterns, with raw results.",
      kicker: "TypeScript Performance Lab", heading: "Measured, not guessed.", crumbs: [] },
    ...ex.map((e) => {
      const h = app.headline(e);
      const short = e.title.split(":")[0];
      return { page: "experiment", id: e.id, e, path: `experiments/${e.folder}/`, og: `lab-${e.id}`,
        title: clip(`Lab #${e.id} raw results: ${short}`, 60),
        description: clip(`Lab #${e.id}. ${app.plain(e.question)}`, 152),
        kicker: `Performance Lab #${e.id}`, heading: e.title, stat: h ? { value: h.value, label: h.label } : null,
        crumbs: [[`Lab #${e.id}`, `experiments/${e.folder}/`]] };
    }),
    { page: "method", path: "method/", og: "method", title: "Method: how the TypeScript Performance Lab measures",
      description: "How every Lab experiment is measured: pinned versions, warm-up, interleaved runs, medians with spread, peak memory and type-safety checks.",
      kicker: "TypeScript Performance Lab", heading: "Method", crumbs: [["Method", "method/"]] },
  ];
}

/* ---------- lastmod: git commit date, or the file's own date when it has uncommitted changes ---------- */
function modified(rel) {
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", rel], { cwd: root, encoding: "utf8" }).trim();
    const committed = execFileSync("git", ["log", "-1", "--format=%cI", "--", rel], { cwd: root, encoding: "utf8" }).trim();
    return dirty || !committed ? statSync(path.join(root, rel)).mtimeMs : Date.parse(committed);
  } catch { return statSync(path.join(root, rel)).mtimeMs; }
}
const day = (t) => new Date(t).toISOString().slice(0, 10);
function lastmod(p) {
  const files = p.page === "experiment" ? [`experiments/${p.e.folder}`] : p.page === "method" ? ["METHOD.md", "tools/notebook/app.mjs"] : ["experiments", "tools/notebook/app.mjs"];
  return day(Math.max(...files.map(modified)));
}

/* ---------- structured data ---------- */
function schema(p, data) {
  const crumbs = { "@type": "BreadcrumbList", itemListElement: [["Martin Ferret", SITE.toString()], ["TypeScript Performance Lab", abs("")], ...p.crumbs.map(([n, u]) => [n, abs(u)])].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) };
  const blocks = [crumbs];
  if (p.page === "home") blocks.unshift({ "@type": "CollectionPage", name: "TypeScript Performance Lab", description: p.description, url: abs(""), inLanguage: "en", author: personRef, hasPart: data.experiments.map((e) => ({ "@id": abs(`experiments/${e.folder}/#article`) })) });
  if (p.page === "experiment") {
    const dates = p.e.sessions.map((s) => s.date).sort();
    blocks.unshift({ "@type": "Article", "@id": abs(`${p.path}#article`), headline: `Lab #${p.e.id}: ${p.e.title}`, description: p.description, author: personRef, publisher: personRef, url: abs(p.path), mainEntityOfPage: abs(p.path), image: abs(`og/${p.og}.png`), inLanguage: "en", datePublished: dates[0].slice(0, 10), dateModified: dates[dates.length - 1].slice(0, 10), about: ["TypeScript", "TypeScript performance"], isBasedOn: `https://github.com/MartinFerret/typescript-performance-lab/tree/main/experiments/${p.e.folder}` });
  }
  return { "@context": "https://schema.org", "@graph": blocks };
}

/* ---------- HTML ---------- */
const GH_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>';
function html(p, data) {
  const url = abs(p.path);
  const image = abs(`og/${p.og}.png`);
  const nav = [["Overview", ""], ...data.experiments.map((e) => [`Lab #${e.id}`, `experiments/${e.folder}/`]), ["Method", "method/"]]
    .map(([label, u]) => `<li><a href="${BASE}${u}"${u === p.path ? ' aria-current="page"' : ""}>${label}</a></li>`).join("");
  return `<!doctype html>
<html lang="en" data-base="${BASE}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(p.title)}</title>
<meta name="description" content="${attr(p.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${p.page === "experiment" ? "article" : "website"}">
<meta property="og:site_name" content="TypeScript Performance Lab">
<meta property="og:title" content="${attr(p.title)}">
<meta property="og:description" content="${attr(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(p.heading)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@FerretMartin1">
<meta name="twitter:title" content="${attr(p.title)}">
<meta name="twitter:description" content="${attr(p.description)}">
<meta name="twitter:image" content="${image}">
<meta name="theme-color" content="#f7f9fb">
<link rel="sitemap" type="application/xml" href="${BASE}sitemap.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&family=Geist:wght@100..900&family=JetBrains+Mono:wght@400..700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE}notebook.css">
<script type="module">import { boot } from "${BASE}app.js"; boot();</script>
<script type="application/ld+json">${JSON.stringify(schema(p, data)).replace(/</g, "\\u003c")}</script>
</head>
<body data-page="${p.page}"${p.e ? ` data-exp="${p.e.id}"` : ""}>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="${BASE}" aria-label="TypeScript Performance Lab, overview"><span class="brand-mark" aria-hidden="true">TS</span>Performance Lab</a>
    <nav aria-label="Lab navigation"><ul class="nav" id="nav">${nav}</ul></nav>
    <a class="gh" href="https://github.com/MartinFerret/typescript-performance-lab">${GH_ICON}Source</a>
  </div>
</header>
<main id="main" tabindex="-1">${app.renderMain(p)}</main>
<footer class="footer">
  <div class="wrap">
    <p>Run by <a class="link" href="${SITE}">Martin Ferret</a>, TypeScript performance expert. Run an experiment, then open a pull request with your results file to add a new machine.</p>
    <ul class="footer-nav" aria-label="Footer">
      <li><a href="${SITE}">${SITE.host}</a></li>
      <li><a href="${new URL("/hire/", SITE)}">Work with Martin</a></li>
      <li><a href="https://github.com/MartinFerret/typescript-performance-lab">Source on GitHub</a></li>
      <li><a href="${BASE}method/">Method</a></li>
    </ul>
  </div>
</footer>
</body>
</html>
`;
}

/* ---------- Open Graph images (1200x630), same look as martinferret.dev ---------- */
const font = (p) => readFileSync(path.join(root, "node_modules/@fontsource", p));
let fonts;
const h = (type, style, children) => ({ type, props: { style, children } });
async function ogPng(p) {
  fonts ??= [
    { name: "Display", data: font("funnel-display/files/funnel-display-latin-500-normal.woff"), weight: 500, style: "normal" },
    { name: "UI", data: font("geist/files/geist-latin-500-normal.woff"), weight: 500, style: "normal" },
    { name: "UI", data: font("geist/files/geist-latin-600-normal.woff"), weight: 600, style: "normal" },
  ];
  const title = p.heading;
  const size = title.length > 60 ? 54 : title.length > 38 ? 64 : 76;
  const tree = h("div", { width: 1200, height: 630, display: "flex", flexDirection: "column", padding: "48px 72px 56px", backgroundImage: "linear-gradient(135deg, #2366c2 0%, #1d5fb8 45%, #174d96 100%)", color: "#ffffff", fontFamily: "UI" }, [
    h("div", { display: "flex", alignItems: "center", height: 56 }, [h("div", { display: "flex", padding: "10px 20px", borderRadius: 999, backgroundColor: "#ffd166", color: "#0e1726", fontSize: 26, fontWeight: 600 }, p.kicker)]),
    h("div", { display: "flex", height: 390, width: 1056, alignItems: "center", justifyContent: "space-between" }, [
      h("div", { display: "flex", fontFamily: "Display", fontSize: size, lineHeight: 1.06, letterSpacing: -2, width: p.stat ? 680 : 1000 }, title),
      ...(p.stat ? [h("div", { display: "flex", flexDirection: "column", alignItems: "flex-end", width: 330 }, [
        h("div", { display: "flex", fontFamily: "Display", fontSize: 112, lineHeight: 1, color: "#ffd166", letterSpacing: -4 }, p.stat.value),
        h("div", { display: "flex", fontSize: 24, color: "#e3ecf9", textAlign: "right", marginTop: 8 }, p.stat.label),
      ])] : []),
    ]),
    h("div", { display: "flex", width: 1056, height: 80, alignItems: "flex-end", justifyContent: "space-between", borderTop: "2px solid rgba(255,255,255,0.25)" }, [
      h("div", { display: "flex", fontFamily: "Display", fontSize: 34 }, "Martin Ferret"),
      h("div", { display: "flex", fontSize: 26, color: "#e3ecf9" }, "TypeScript Performance Lab"),
    ]),
  ]);
  const svg = await satori(tree, { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}

/* ---------- write everything ---------- */
export async function writePages(data) {
  app.setBase(BASE);
  app.setData(data);
  const list = pages(data);
  mkdirSync(path.join(docs, "og"), { recursive: true });
  for (const p of list) {
    const dir = path.join(docs, p.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.html"), html(p, data));
    writeFileSync(path.join(docs, "og", `${p.og}.png`), await ogPng(p));
  }
  copyFileSync(path.join(root, "tools/notebook/app.mjs"), path.join(docs, "app.js"));
  const urls = list.map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${lastmod(p)}</lastmod></url>`).join("\n");
  writeFileSync(path.join(docs, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  return list.map((p) => abs(p.path));
}
