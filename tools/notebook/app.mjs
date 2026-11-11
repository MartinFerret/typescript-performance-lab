const REPO = "https://github.com/MartinFerret/typescript-performance-lab";
// Base path of the notebook (set by tools/build-index.mjs in Node, read from <html data-base> in the browser).
let BASE = "/typescript-performance-lab/";
export const setBase = (b) => { BASE = b; };
const expHref = (e) => `${BASE}experiments/${e.folder}/`;
const methodHref = () => `${BASE}method/`;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const md = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const plain = (s) => String(s ?? "").replace(/`/g, "");
const vers = (s) => esc(s).replace(/(\d+\.\d+\.\d+)/g, '<span class="ver">$1</span>');
const median = (a) => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const fmtS = (v) => v == null ? "n/a" : (v < 1 ? v.toFixed(3) : v < 10 ? v.toFixed(2) : v.toFixed(1)) + " s";
const fmtN = (v) => v == null ? "n/a" : Math.round(v).toLocaleString("en-US");
const fmtMB = (kb) => kb == null ? "n/a" : (kb / 1024 >= 1024 ? (kb / 1048576).toFixed(1) + " GB" : Math.round(kb / 1024) + " MB");
const date = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
/* "2026-10" -> "October 2026", "2026-10-02" -> "2 October 2026". */
const openedText = (o) => /^\d{4}-\d{2}$/.test(o) ? new Date(`${o}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : date(o);
const cpuShort = (cpu) => cpu.replace(/\(R\)|Processor.*$|@.*$/g, "").replace(/\s+/g, " ").trim();
const envText = (e) => `${e.cpu.replace(/\(R\)/g, "").replace(/\s+/g, " ")}, ${e.cores} ${e.cores > 1 ? "cores" : "core"}, ${e.memoryGB} GB RAM, ${e.platform}, Node.js ${e.node}`;
const envShort = (e) => `${cpuShort(e.cpu)}, ${e.cores} ${e.cores > 1 ? "cores" : "core"}, ${e.memoryGB} GB`;
/* Sessions newest first. */
const sessionsOf = (e) => (e.sessions ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));

const svg = (paths, vb = "0 0 20 20", sw = 1.8) => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICON = {
  lab: '<path d="M8 3h4M9 3v5l-4.5 7.5A1.5 1.5 0 0 0 5.8 18h8.4a1.5 1.5 0 0 0 1.3-2.5L11 8V3"/><path d="M6.5 13h7"/>',
  confirmed: '<circle cx="10" cy="10" r="7"/><path d="m6.5 10 2.5 2.5 4.5-5"/>',
  rejected: '<circle cx="10" cy="10" r="7"/><path d="m7 7 6 6M13 7l-6 6"/>',
  open: '<circle cx="10" cy="10" r="7"/><path d="M8 8a2 2 0 1 1 2.8 1.8c-.6.3-.8.7-.8 1.2"/><circle cx="10" cy="13.6" r=".6" fill="currentColor"/>',
  warn: '<path d="M10 3 2.5 16.5h15z"/><path d="M10 8.5v3.5M10 14.3v.2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  copy: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>',
  down: '<path d="M8 3v10m-4-4 4 4 4-4"/>',
};
const arrow = svg(ICON.arrow, "0 0 24 24", 2);
const tag = (label, tone = "violet", icon = svg(ICON.lab)) => `<span class="tag tag--${tone}"><span class="tag-ic" aria-hidden="true">${icon}</span><span>${label}</span></span>`;
const STATUS = { confirmed: ["Confirmed", "merged"], rejected: ["Rejected", "closed"], open: ["Open question", "discussion"] };
const badge = (status) => { const [label, v] = STATUS[status] ?? [status, "discussion"]; return `<span class="badge badge--${v}">${svg(ICON[status] ?? ICON.open)}${esc(label)}</span>`; };
const copyLabel = `${svg(ICON.copy)}<span>Copy</span>`;
const codeBlock = (cmd) => `<div class="code"><code>${esc(cmd)}</code><button class="copy" type="button" data-copy="${esc(cmd)}">${copyLabel}</button></div>`;

/* Medians recomputed from the raw runs. Memory: rss = peak RSS from /usr/bin/time (MiB), reported = the compiler's own "Memory used" line (KiB). */
function stats(c) {
  const r = c.runs || []; if (!r.length) return null;
  const pick = (k) => r.map((x) => x[k]).filter((v) => v != null);
  const ck = pick("checkTime"), tt = pick("totalTime"), rss = pick("maxRssMB"), rep = pick("memoryUsedKB");
  const same = (k) => new Set(r.map((x) => x[k])).size <= 1;
  return { n: r.length, check: median(ck), checkMin: Math.min(...ck), checkMax: Math.max(...ck), total: median(tt),
    rss: rss.length ? median(rss) : null, reported: rep.length ? median(rep) : null,
    instantiations: median(pick("instantiations")), types: median(pick("types")), files: median(pick("files")),
    stable: same("files") && same("types") && same("instantiations") };
}
const fmtMiB = (mib) => mib == null ? "n/a" : mib >= 1024 ? `${(mib / 1024).toFixed(1)} GiB` : `${Math.round(mib)} MiB`;
const fmtKiB = (kib) => kib == null ? "n/a" : fmtMiB(kib / 1024);
/* Why a condition failed, from what the run recorded. Never the machine's RAM unless the run says so. */
function failLabel(c, s) {
  if (c.status !== "out-of-memory") return "Did not finish";
  const f = c.failure;
  if (f?.cause === "v8-heap-limit") {
    const custom = c.env?.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1];
    const lim = custom ? `${Number(custom) / 1024} GiB` : s.protocol?.heapLimitBytes ? `${(s.protocol.heapLimitBytes / 2 ** 30).toFixed(1)} GiB` : null;
    return `Out of memory at Node.js's ${custom ? "" : "default "}heap limit${lim ? ` (${lim})` : ""}`;
  }
  return "Out of memory (cause not recorded)";
}
const check = (s, key) => { const c = s.conditions.find((x) => x.key === key); return c && c.status === "ok" ? stats(c)?.check : undefined; };

/* Headline result from the newest session, never typed by hand. */
/* The newest session that has every one of these conditions measured (a later partial re-measurement may not). */
const sessionWith = (e, keys) => sessionsOf(e).find((x) => keys.every((k) => x.conditions.some((c) => c.key === k && c.status === "ok")));
function headline(e) {
  const s = sessionWith(e, ["before-ts7", "after-ts7"]) ?? sessionWith(e, ["src-ts6", "src-ts7"]); if (!s) return null;
  const b7 = check(s, "before-ts7"), a7 = check(s, "after-ts7");
  if (b7 && a7) return { value: `−${Math.round((1 - a7 / b7) * 100)}%`, label: "check time with TypeScript 7 after the fix", s };
  const six = check(s, "src-ts6"), seven = check(s, "src-ts7");
  if (six && seven) return { value: `${(six / seven).toFixed(1)}×`, label: "faster check of the sources, TypeScript 7 vs 6", s };
  return null;
}

/* Summary chart: before/after per compiler on the newest machine, or TS 6 vs 7 per machine. */
function chartGroups(e) {
  const sessions = sessionsOf(e), s = sessionWith(e, ["before-ts7", "after-ts7"]) ?? sessions[0];
  if (!s) return { groups: [], delta: "percent" };
  const versions = [...new Set(s.conditions.map((c) => c.key.match(/^(?:before|after)-ts(\d+)$/)?.[1]).filter(Boolean))];
  if (versions.length) {
    const groups = versions.map((v) => ({ label: `TypeScript ${v}`, bars: [
      { label: "Before the fix", value: check(s, `before-ts${v}`), tone: "before" },
      { label: "After the fix", value: check(s, `after-ts${v}`), tone: "after" },
    ] })).filter((g) => g.bars.every((b) => b.value));
    return { groups, delta: "percent", caption: `${envShort(s.environment)}, ${date(s.date)}` };
  }
  const groups = sessions.slice().reverse().map((x) => ({ label: cpuShort(x.environment.cpu), bars: [
    { label: "TypeScript 6", value: check(x, "src-ts6"), tone: "before" },
    { label: "TypeScript 7", value: check(x, "src-ts7"), tone: "after" },
  ] })).filter((g) => g.bars.every((b) => b.value));
  return { groups, delta: "times", caption: "Library sources, one group per machine" };
}

function barChart({ groups, delta, caption }, label) {
  if (!groups.length) return "";
  const max = Math.max(...groups.flatMap((g) => g.bars.map((b) => b.value)));
  const change = (g) => { const [a, b] = g.bars.map((x) => x.value); return delta === "times" ? `${(a / b).toFixed(1)}× faster` : `−${Math.round((1 - b / a) * 100)}%`; };
  const aria = `${label}. ${groups.map((g) => `${g.label}: ${g.bars.map((b) => `${b.label} ${fmtS(b.value)}`).join(", ")}, ${change(g)}`).join(". ")}.`;
  const legend = [...new Map(groups.flatMap((g) => g.bars).map((b) => [b.tone, b.label])).entries()];
  return `<figure class="bc" data-observe>
    <div class="bc-plot" role="img" aria-label="${esc(aria)}">
      ${groups.map((g, gi) => `<div class="bc-group" style="--g:${gi}">
        <span class="bc-delta">${svg(ICON.down, "0 0 16 16", 2)}${change(g)}</span>
        <div class="bc-bars">${g.bars.map((b, bi) => `<div class="bc-bar bc-bar--${b.tone}" style="--h:${Math.max(2, (b.value / max) * 100)}%;--i:${gi * 2 + bi}"><span class="bc-val">${fmtS(b.value)}</span><span class="bc-fill"></span></div>`).join("")}</div>
        <span class="bc-glabel">${esc(g.label)}</span>
      </div>`).join("")}
    </div>
    <figcaption class="bc-legend">${legend.map(([tone, l]) => `<span><i class="bc-key bc-key--${tone}"></i>${esc(l)}</span>`).join("")}<span class="bc-note">Median check time, lower is faster${caption ? `. ${esc(caption)}` : ""}</span></figcaption>
  </figure>`;
}

const hero = ({ crumb = "", title, sub = "", actions = "", fig = "" }) => `
  <section class="frame hero-panel" aria-labelledby="page-title">
    <div class="wrap hero${fig ? "" : " hero--solo"}">
      <div class="hero-text">
        ${crumb ? `<p class="hero-crumb">${crumb}</p>` : ""}
        <h1 class="hero-title" id="page-title">${title}</h1>
        ${sub ? `<p class="hero-sub">${sub}</p>` : ""}
        ${actions ? `<div class="cluster hero-actions">${actions}</div>` : ""}
      </div>
      ${fig ? `<div class="hero-fig">${fig}</div>` : ""}
    </div>
  </section>`;

/* ---------- Overview hero: a replay of the measured check, file by file ---------- */
function raceData(ex) {
  // The source-check comparison of the newest TS 6 vs TS 7 session, else the newest before/after pair.
  for (const e of ex.slice().sort((a, b) => b.id.localeCompare(a.id))) {
    for (const s of sessionsOf(e)) {
    const pairs = [["src-ts6", "src-ts7", "TypeScript", "TypeScript", "type-fest"], ["before-ts7", "after-ts7", "Before the fix,", "After the fix,", "typed events"]];
    for (const [ka, kb, la, lb, what] of pairs) {
      const ca = s.conditions.find((c) => c.key === ka), cb = s.conditions.find((c) => c.key === kb);
      const a = ca && ca.status === "ok" && stats(ca), b = cb && cb.status === "ok" && stats(cb);
      const ver = (c) => c.compiler.match(/\d+\.\d+\.\d+/)?.[0] ?? "";
      if (a && b) return { e, s, what, files: Math.round(a.files), a: { label: la, ver: ver(ca), t: a.check }, b: { label: lb, ver: ver(cb), t: b.check } };
    }
    }
  }
  return null;
}

function heroHome(ex) {
  const r = raceData(ex);
  const title = ["Measured,", "not", "guessed."].map((w, i) => `<span class="hx-word${i === 0 ? " hx-mark" : ""}" style="--w:${i}">${w}</span>`).join(" ");
  let win = "";
  if (r) {
    const cols = r.files > 200 ? 40 : r.files > 80 ? 24 : 14;
    const cells = "<i></i>".repeat(r.files);
    const x = (r.a.t / r.b.t).toFixed(1);
    const run = (v, cls) => `<div class="run ${cls}" data-t="${v.t}">
        <div class="run-head"><span class="run-name"><span class="run-dot"></span>${esc(v.label)} <span class="ver">${esc(v.ver)}</span></span><span class="run-time">0.000 s</span></div>
        <div class="files" style="--cols:${cols}" aria-hidden="true">${cells}</div>
        <div class="run-meta"><span data-count>0 / ${r.files} files</span> · <span data-state-label>waiting</span></div>
      </div>`;
    win = `<figure class="tw" data-race aria-label="Replay of the measured check of ${esc(r.what)}: ${esc(r.a.label)} ${esc(r.a.ver)} ${fmtS(r.a.t)}, ${esc(r.b.label)} ${esc(r.b.ver)} ${fmtS(r.b.t)}, ${x} times faster.">
      <div class="tw-top"><p><b>Same code, two compilers</b>${esc(r.what)}, ${esc(envShort(r.s.environment))}</p><button class="tw-replay" type="button" data-replay aria-label="Replay">${svg('<path d="M4 10a6 6 0 1 0 2-4.5"/><path d="M4 3v3.5h3.5"/>')}</button></div>
      ${run(r.b, "run--fast")}${run(r.a, "run--slow")}
      <figcaption class="tw-foot">
        <p>One square per file. Median check times from ${date(r.s.date)}, replayed slowed down at the real ratio. <a href="${expHref(r.e)}">See every run</a></p>
        <span class="tw-x"><b>${x}×</b><span>faster</span></span>
      </figcaption>
    </figure>`;
  }
  return `<section class="frame hero-panel" aria-labelledby="page-title">
    <div class="wrap hero hx">
      <div class="hero-text">
        <h1 class="hero-title" id="page-title">${title}</h1>
        <p class="hero-sub">How fast TypeScript checks your types, measured on pinned versions, with every raw run published.</p>
        <div class="cluster hero-actions"><a class="cta cta--soft" href="#experiments" data-scroll>See the experiments ${arrow}</a><a class="cta cta--onblue" href="${methodHref()}">Read the method</a></div>
      </div>
      ${win}
    </div>
  </section>`;
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let raceFrame = 0;
function playRace(root) {
  if (!root) return;
  cancelAnimationFrame(raceFrame);
  const runs = $$(".run", root).map((el) => {
    const cells = $$(".files i", el);
    // A fixed pseudo-random order, so the files light up scattered rather than row by row.
    const order = cells.map((_, i) => i);
    let seed = 20261110; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    return { el, t: +el.dataset.t, cells, order, lit: 0, time: $(".run-time", el), count: $("[data-count]", el), state: $("[data-state-label]", el) };
  });
  const max = Math.max(...runs.map((r) => r.t));
  const DURATION = 3800; // ms of animation for the slower compiler
  root.removeAttribute("data-finished");
  for (const r of runs) { r.cells.forEach((c) => c.classList.remove("on", "hot")); r.lit = 0; r.el.dataset.state = "waiting"; r.state.textContent = "waiting"; }
  const draw = (sim) => {
    for (const r of runs) {
      const p = Math.min(1, sim / r.t), want = Math.round(p * r.cells.length);
      $$(".hot", r.el).forEach((c) => c.classList.remove("hot"));
      while (r.lit < want) r.cells[r.order[r.lit++]].classList.add("on");
      if (p < 1 && r.lit) for (let k = 1; k <= Math.min(3, r.lit); k++) r.cells[r.order[r.lit - k]].classList.add("hot");
      r.time.textContent = fmtS(Math.min(sim, r.t));
      r.count.textContent = `${r.lit} / ${r.cells.length} files`;
      const st = p >= 1 ? "done" : sim > 0 ? "running" : "waiting";
      if (r.el.dataset.state !== st) { r.el.dataset.state = st; r.state.textContent = st === "done" ? "checked" : st === "running" ? "checking" : "waiting"; }
    }
  };
  if (reduced()) { draw(max); root.setAttribute("data-finished", ""); return; }
  const start = performance.now() + 500;
  const tick = (now) => {
    const sim = Math.max(0, (now - start) / DURATION) * max;
    draw(sim);
    if (sim < max) raceFrame = requestAnimationFrame(tick);
    else root.setAttribute("data-finished", "");
  };
  draw(0);
  raceFrame = requestAnimationFrame(tick);
}

function initHero() {
  const race = $("[data-race]");
  if (!race) return;
  if ("IntersectionObserver" in window) {
    const o = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { playRace(race); o.disconnect(); } }, { threshold: 0.35 });
    o.observe(race);
  } else playRace(race);
}

/* ---------- Overview ---------- */
const STEPS = [
  { t: "One question", d: "A single hypothesis, written before measuring.", i: '<circle cx="12" cy="12" r="8"/><path d="M11 9l2-1v8"/>', tone: "coral" },
  { t: "Pinned versions", d: "Compilers, target project commit and machine are recorded with every result.", i: '<path d="M12 3l5 5-3 1-3 5-2-2-4 4M14 4l6 6"/>', tone: "blue" },
  { t: "Same measurement", d: "<code>tsc --extendedDiagnostics</code>, several runs per condition, median reported with the range.", i: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>', tone: "violet" },
  { t: "One change at a time", d: "Type safety proven with tests that must still fail to compile.", i: '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="m9 12 2 2 4-4.5"/>', tone: "mint" },
];
const ruleCard = (r, i, label) => `<li style="--i:${i}"><div class="kcard">
  <span class="tag tag--${r.tone}"><span class="tag-ic" aria-hidden="true">${svg(r.i, "0 0 24 24")}</span><span>${label} ${i + 1}</span></span>
  <h3 class="kcard-title">${r.t}</h3><p class="kcard-text">${r.d}</p></div></li>`;

function home() {
  const ex = DATA.experiments;
  return `${heroHome(ex)}
  <section class="wrap block" id="experiments" aria-labelledby="exp-title">
    <div class="head-row"><div><h2 id="exp-title">Experiments</h2><p>Newest first. Every number below is computed from the raw runs in <code>data.json</code>.</p></div></div>
    ${ex.slice().sort((a, b) => b.id.localeCompare(a.id)).map((e, i) => {
      const h = headline(e), chart = barChart(chartGroups(e), `Lab #${e.id}, median check time`);
      return `<article class="zig${i % 2 ? " zig--rev" : ""}" data-reveal>
        <div class="zig-text">
          <span class="zig-tags">${tag(`Lab #${esc(e.id)}`)}${badge(e.status)}${e.opened ? `<span class="meta">Opened ${openedText(e.opened)}</span>` : ""}</span>
          <h3>${md(e.title)}</h3>
          ${h ? `<p class="zig-result"><span class="big">${h.value}</span><span>${esc(h.label)}</span></p>` : ""}
          ${e.remeasuring ? `<p class="remeasure"><span class="badge badge--review">${svg(ICON.open)}Being re-measured</span></p>` : ""}
          <p class="zig-verdict">${md(e.takeaway || e.verdict)}</p>
          <a class="cta cta--outline" href="${expHref(e)}">Read the experiment ${arrow}</a>
        </div>
        ${chart ? `<div class="zig-chart">${chart}</div>` : ""}
      </article>`;
    }).join("")}
  </section>
  <section class="frame sky-frame" aria-labelledby="how-title" data-reveal>
    <div class="wrap">
      <div class="head-center">
        ${tag("Method")}
        <h2 id="how-title">How every experiment works</h2>
        <p>Same protocol each time, so results can be compared and reproduced on any machine.</p>
      </div>
      <ol class="g2" role="list">${STEPS.map((r, i) => ruleCard(r, i, "Step")).join("")}</ol>
      <p class="cluster" style="justify-content:center;margin-top:var(--head-gap)"><a class="cta cta--primary" href="${methodHref()}">Read the full method ${arrow}</a></p>
    </div>
  </section>`;
}

/* ---------- Method ---------- */
const MEASURED = [
  { t: "Check time", d: "Time spent by the type-checker, the main result. Reported as the median, with the fastest and slowest runs.", i: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2M10 3h4"/>', tone: "blue" },
  { t: "Total time", d: "Parse, bind and check together.", i: '<path d="M4 12h16M4 6h10M4 18h7"/>', tone: "violet" },
  { t: "Memory", d: "Peak resident memory (RSS) of the largest compiler process, from <code>/usr/bin/time</code>. The compiler's own \"Memory used\" line is a different metric and is always labeled separately.", i: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>', tone: "coral" },
  { t: "Files, types, instantiations", d: "The compiler's counters. They must be identical across runs of the same condition, which proves every run checked the same program.", i: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', tone: "mint" },
];
const PROTOCOL = [
  { t: "Pin everything", d: "TypeScript versions are pinned in <code>package.json</code>, external projects are cloned at a pinned commit, and the machine context is saved with every result.", i: '<path d="M12 3l5 5-3 1-3 5-2-2-4 4M14 4l6 6"/>', tone: "blue" },
  { t: "Measure the same way", d: "Each condition runs <code>tsc -p &lt;project&gt; --extendedDiagnostics</code> several times. In protocol mode, one warm-up run per condition is discarded, conditions are interleaved (A B C A B C), and the machine idles 2 minutes first.", i: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>', tone: "violet" },
  { t: "Change one thing at a time", d: "A fix is minimal and keeps the same type safety.", i: '<circle cx="12" cy="12" r="8"/><path d="M11 9l2-1v8"/>', tone: "coral" },
  { t: "Prove type safety", d: "When a fix changes types, a <code>safety.ts</code> file lists usages that must still fail to compile. The experiment stops if it fails.", i: '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="m9 12 2 2 4-4.5"/>', tone: "mint" },
  { t: "Publish the verdict, whatever it is", d: "A hypothesis can be confirmed, rejected or stay open.", i: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', tone: "amber" },
];
function method() {
  return `${hero({
    crumb: `<a href="${BASE}">Performance Lab</a><span>/ Method</span>`,
    title: "Method",
    sub: "Every experiment follows the same protocol, so results can be compared and reproduced on any machine.",
  })}
  <section class="wrap block" aria-labelledby="m-what" data-reveal>
    <div class="head-row"><div><h2 id="m-what">What is measured</h2><p>One main result, three supporting measures.</p></div></div>
    <ul class="g2" role="list">${MEASURED.map((r, i) => `<li style="--i:${i}"><div class="kcard">
      <span class="tag tag--${r.tone}"><span class="tag-ic" aria-hidden="true">${svg(r.i, "0 0 24 24")}</span><span>${i === 0 ? "Main result" : "Supporting"}</span></span>
      <h3 class="kcard-title">${r.t}</h3><p class="kcard-text">${r.d}</p></div></li>`).join("")}</ul>
  </section>
  <section class="frame sky-frame" aria-labelledby="m-proto" data-reveal>
    <div class="wrap">
      <div class="head-center">${tag("Protocol")}<h2 id="m-proto">Five rules, every experiment</h2><p>A number is only worth publishing if anyone can get it again.</p></div>
      <ol class="g3" role="list">${PROTOCOL.map((r, i) => ruleCard(r, i, "Rule")).join("")}</ol>
    </div>
  </section>
  <section class="wrap block" aria-labelledby="m-limits" data-reveal>
    <div class="kcard">
      <h2 id="m-limits">Limits</h2>
      <ul class="plain read">
        <li>Timings vary between machines: compare conditions measured on the same machine.</li>
        <li>Above 5% coefficient of variation, the cause is investigated and 5 more runs are added. If it stays above 5%, the limits say so.</li>
        <li>Gains are ratios of medians, shown with a conservative range: fastest run of one condition over slowest of the other, both ways.</li>
        <li>TypeScript 6 and 7 may not count types and instantiations the same way: do not compare these counters across compilers.</li>
        <li>Close other heavy applications while measuring.</li>
      </ul>
    </div>
  </section>`;
}

/* ---------- Experiment ---------- */
let DATA, sessionIdx = {};
const SCOPE = { before: "", after: "", sources: "Library sources", checkers: "TypeScript 7 checker count (separate series)", full: "Full suite with type tests" };
function decompositionCard(e, s) {
  const m = (e.analysis ?? []).find((x) => x.machine.cpu === s.environment.cpu && x.machine.cores === s.environment.cores);
  const d = m?.decomposition; if (!d) return "";
  const row = (name, k, what) => `<tr><td>${name}<span class="range">${what}</span></td><td class="n">${d[k].value.toFixed(1)}×<span class="range">${d[k].low.toFixed(2)} to ${d[k].high.toFixed(2)}</span></td></tr>`;
  return `<div class="kcard">
    <h3>Where the gain on the sources comes from</h3>
    <div class="table-wrap" style="border:0;padding:0;border-radius:0"><table>
      <thead><tr><th>Factor</th><th class="n">Ratio of medians<span class="range">conservative range</span></th></tr></thead>
      <tbody>
        ${row("Native compiler", "native", "TS 6 / TS 7 single-threaded")}
        ${row("Parallel checking", "parallel", "TS 7 single-threaded / TS 7 default")}
        ${row("Total", "total", "TS 6 / TS 7 default")}
      </tbody></table></div>
    <p class="meta">Native × parallel = ${d.productCheck.toFixed(3)}, total = ${d.total.value.toFixed(3)}: the two factors multiply exactly to the total before rounding. Range: fastest run of one condition over slowest of the other, both ways.</p>
  </div>`;
}

function resultsBlock(e, sessions, si) {
  const s = sessions[si];
  const rows = s.conditions.map((c) => ({ c, s: c.status === "ok" ? stats(c) : null }));
  const isAfter = (c) => c.scope === "before" || c.scope === "after" ? c.scope === "after" : /TypeScript 7/.test(c.compiler);
  const groups = [];
  for (const r of rows) { const name = SCOPE[r.c.scope] ?? r.c.scope; let g = groups.find((x) => x.name === name); if (!g) groups.push((g = { name, rows: [] })); g.rows.push(r); }
  const bars = groups.map((g) => {
    const ok = g.rows.filter((r) => r.s);
    const max = Math.max(...ok.map((r) => r.s.checkMax), 0.001);
    const pct = (v) => (v / max) * 100;
    return `<div class="bar-group">${g.name ? `<h4 class="meta" style="font-weight:600;color:var(--ink-2)">${esc(g.name)}${groups.length > 1 && ok.length ? ` <span style="font-weight:400">· scale 0 to ${fmtS(max)}</span>` : ""}</h4>` : ""}${g.rows.map((r) => {
      if (!r.s) return `<div class="bar-row"><div class="bar-head"><span>${vers(r.c.label)}</span><span class="stamp">${svg(ICON.warn)}${esc(failLabel(r.c, s))}</span></div></div>`;
      return `<div class="bar-row">
        <div class="bar-head"><span>${vers(r.c.label)}</span><span class="v">${fmtS(r.s.check)}</span></div>
        <div class="bar-track" role="img" aria-label="${esc(r.c.label)}: median check time ${fmtS(r.s.check)}, fastest ${fmtS(r.s.checkMin)}, slowest ${fmtS(r.s.checkMax)}">
          <div class="bar-fill${isAfter(r.c) ? " bar-fill--after" : ""}" style="width:${pct(r.s.check)}%"></div>
          <span class="bar-range" aria-hidden="true" style="left:${pct(r.s.checkMin)}%;width:${Math.max(pct(r.s.checkMax) - pct(r.s.checkMin), 0.4)}%"></span>
        </div></div>`;
    }).join("")}</div>`;
  }).join("");
  const unstable = rows.filter((r) => r.s && !r.s.stable).map((r) => r.c.label);
  const runCounts = [...new Set(rows.filter((r) => r.s).map((r) => r.s.n))].sort((a, b) => b - a);
  const superseded = (e.supersededSessions ?? []).filter((x) => x.environment.cpu === s.environment.cpu && x.environment.cores === s.environment.cores);
  const seg = sessions.length > 1 ? `<div class="seg" role="group" aria-label="Machine">${sessions.map((x, i) => { const dup = sessions.filter((y) => envShort(y.environment) === envShort(x.environment)).length > 1; return `<button type="button" data-s="${i}" aria-pressed="${i === si}">${esc(envShort(x.environment))}${dup ? `, ${date(x.date)}` : ""}</button>`; }).join("")}</div>` : "";
  return `
    <div class="machines-head">
      <div><h2 id="results">Results</h2><p class="meta" style="margin-top:8px">${esc(envText(s.environment))}. Measured ${date(s.date)}.</p></div>
      ${seg}
    </div>
    <div class="kcard">
      <div class="bars" data-observe>${bars}</div>
      <p class="meta">Bar: median check time per condition. Bracket: fastest to slowest run. Shorter is faster.${groups.length > 1 ? " Each group has its own scale; within a group, bars share one scale." : ""}</p>
    </div>
    ${decompositionCard(e, s)}
    <div class="table-wrap" tabindex="0" role="region" aria-label="Results table, scrolls horizontally"><table>
      <thead><tr><th>Condition</th><th class="n">Runs</th><th class="n">Check time</th><th class="n">Total</th><th class="n">Peak RSS</th><th class="n">Memory reported<span class="range">by the compiler</span></th><th class="n">Instantiations</th><th class="n">Types</th><th class="n">Files</th></tr></thead>
      <tbody>${rows.map((r) => r.s
        ? `<tr><td>${vers(r.c.label)}${r.s.stable ? "" : `<span class="range">counters vary across runs</span>`}</td><td class="n">${r.s.n}</td><td class="n">${fmtS(r.s.check)}<span class="range">${fmtS(r.s.checkMin)} to ${fmtS(r.s.checkMax)}</span></td><td class="n">${fmtS(r.s.total)}</td><td class="n">${fmtMiB(r.s.rss)}</td><td class="n">${fmtKiB(r.s.reported)}</td><td class="n">${fmtN(r.s.instantiations)}</td><td class="n">${fmtN(r.s.types)}</td><td class="n">${fmtN(r.s.files)}</td></tr>`
        : `<tr><td>${vers(r.c.label)}</td><td class="fail" colspan="8">${esc(failLabel(r.c, s))}${r.c.failure?.maxRssMB ? `, peak RSS ${fmtMiB(r.c.failure.maxRssMB)}` : ""}</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="meta">Medians of ${runCounts.join(", ")} runs per condition (see the Runs column). Peak RSS: <code>/usr/bin/time</code>, maximum resident set size of the largest process. Memory reported: the compiler's own "Memory used" line, a different metric for each compiler. ${unstable.length ? `Counters varied across runs for: ${unstable.map(esc).join("; ")}. They were identical across runs for every other condition.` : "Counters were identical across runs of each condition."}</p>
    ${superseded.length ? `<p class="meta">Superseded: ${superseded.map((x) => `the session of ${date(x.date)} (${x.runsPerCondition} runs, no warm-up, not interleaved)`).join(", ")} on this machine. Its raw file stays in <code>results/</code>.</p>` : ""}`;
}

function experiment(e) {
  const sessions = sessionsOf(e);
  const si = sessionIdx[e.id] ?? 0, s = sessions[si];
  const h = headline(e);
  const target = e.target || s?.target;
  const chart = barChart(chartGroups(e), `Lab #${e.id}, median check time`);
  const compilers = [...new Set(e.sessions.flatMap((x) => x.conditions.map((c) => c.compiler)))].sort();
  const fig = `<div class="res">
    <span class="res-top">${tag(`Lab #${esc(e.id)}`)}${badge(e.status)}</span>
    ${h ? `<span class="res-num">${h.value}</span><span class="res-label">${esc(h.label)}</span>` : `<span class="res-label">${esc(plain(e.verdict))}</span>`}
    ${h ? `<span class="res-meta">Computed from medians on ${esc(envShort(h.s.environment))}, ${date(h.s.date)}. Verified on ${compilers.map(vers).join(" and ")}.</span>` : ""}
  </div>`;
  return `${hero({
    crumb: `<a href="${BASE}">Performance Lab</a><span>/ Experiment #${esc(e.id)}</span>${e.opened ? `<span>· Opened ${openedText(e.opened)}</span>` : ""}`,
    title: md(e.title),
    sub: md(e.question),
    actions: `<a class="cta cta--soft" href="#results" data-scroll>See the results</a><a class="cta cta--onblue" href="#reproduce" data-scroll>Reproduce it</a>`,
    fig,
  })}
  <section class="wrap block" aria-labelledby="verdict" data-reveal>
    <div class="verdict">
      <div class="kcard v-main">
        <h2 id="verdict">Verdict</h2>
        ${e.remeasuring ? `<p class="remeasure"><span class="badge badge--review">${svg(ICON.open)}Being re-measured</span> This experiment is being re-measured. The verdict and numbers below stay as published until the new results are in.</p>` : ""}
        <p class="v-lead">${md(e.verdict)}</p>
        ${e.takeaway ? `<h3>What to do with it</h3><p class="read">${md(e.takeaway)}</p>` : ""}
      </div>
      ${chart ? `<div class="kcard v-chart"><h3>Median check time</h3>${chart}</div>` : ""}
    </div>
  </section>
  ${s ? `<section class="wrap block" aria-labelledby="setup" data-reveal>
    <div class="verdict">
      <div class="kcard">
        <h2 id="setup">Setup</h2>
        <dl class="facts">
          ${target ? `<dt>Target</dt><dd><a class="link" href="${esc(target.repository)}">${esc(target.name)}</a> at commit <span class="ver">${esc((target.commit || "").slice(0, 7))}</span></dd>` : `<dt>Target</dt><dd>Code in <code>experiments/${esc(e.folder)}</code></dd>`}
          ${e.opened ? `<dt>Opened</dt><dd>${openedText(e.opened)}</dd>` : ""}
          <dt>Command</dt><dd><code>tsc --extendedDiagnostics</code>${s.protocol ? `, ${s.protocol.warmupDiscarded ? "one discarded warm-up run per condition, " : ""}${s.protocol.interleaved ? "conditions interleaved (A B C A B C)" : "runs in sequence"}` : `, ${s.runsPerCondition} runs per condition, no warm-up, runs in sequence`}</dd>
          ${s.protocol?.series?.[0]?.powerBefore ? (() => { const ps = s.protocol.series.flatMap((x) => [x.powerBefore, x.powerAfter]).filter(Boolean); const src = [...new Set(ps.map((p) => p.source))].join(", "); const loads = ps.map((p) => p.loadAverage[0]); return `<dt>Power</dt><dd>${esc(src === "AC" ? "AC power" : src)}, Low Power Mode ${ps.some((p) => p.lowPowerMode) ? "on" : "off"}, load average ${Math.min(...loads).toFixed(1)} to ${Math.max(...loads).toFixed(1)}</dd>`; })() : ""}
          <dt>Machine</dt><dd>${esc(envText(s.environment))}</dd>
          ${s.safetyCheck ? `<dt>Type safety</dt><dd>${s.safetyCheck === "passed" ? `<span class="ok-line">${svg(ICON.confirmed)}Safety check passed: invalid usages still fail to compile.</span>` : esc(s.safetyCheck)}</dd>` : ""}
        </dl>
      </div>
      <div class="kcard">
        <h3>Conditions</h3>
        <ul class="plain">${s.conditions.map((c) => `<li>${vers(c.label)}${c.flags && c.flags.length ? ` with <code>${esc(c.flags.join(" "))}</code>` : ""}${c.env?.NODE_OPTIONS ? ` with <code>NODE_OPTIONS=${esc(c.env.NODE_OPTIONS)}</code>` : ""}${c.runs?.length ? `, ${c.runs.length} ${c.runs.length === 1 ? "run" : "runs"}` : ""}</li>`).join("")}</ul>
      </div>
    </div>
  </section>
  <section class="wrap block stack" aria-labelledby="results" data-reveal data-results>${resultsBlock(e, sessions, si)}</section>` : `<section class="wrap block"><p class="empty">Not measured yet. Run the command below to add the first results.</p></section>`}
  <section class="wrap block" aria-labelledby="limits" data-reveal>
    <div class="kcard">
      <h2 id="limits">Limits</h2>
      ${(e.notes || []).map((n) => `<p class="v-note"><b>Note</b>${md(n)}</p>`).join("")}
      <ul class="plain read"><li>Results come from one machine per session: compare conditions within the same machine only.</li></ul>
    </div>
  </section>
  <section class="frame sky-frame" id="reproduce" aria-labelledby="repro-title" data-reveal>
    <div class="wrap stack">
      <div class="head-row" style="margin-bottom:0">
        <div><h2 id="repro-title">Reproduce it</h2><p>Node.js 22 or later and git. Results are saved in <code>experiments/${esc(e.folder)}/results/</code>. Open a pull request with yours to add a new machine.</p></div>
        <a class="cta cta--primary" href="${REPO}/tree/main/experiments/${esc(e.folder)}">Source and raw results ${arrow}</a>
      </div>
      ${codeBlock(e.reproduce)}
    </div>
  </section>`;
}

/* ---------- Reveal on scroll, draw charts once ---------- */
const io = typeof window !== "undefined" && "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    en.target.setAttribute(en.target.hasAttribute("data-observe") ? "data-drawn" : "data-shown", "");
    io.unobserve(en.target);
  }
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }) : null;
function observe(root = document) {
  for (const n of $$("[data-reveal]:not([data-shown]), [data-observe]:not([data-drawn])", root)) {
    if (io) io.observe(n); else n.setAttribute(n.hasAttribute("data-observe") ? "data-drawn" : "data-shown", "");
  }
}

/* ---------- Server render (Node, tools/build-index.mjs) and browser boot ---------- */
export const setData = (d) => { DATA = d; };
/** The HTML of <main> for a page: { page: "home" } | { page: "experiment", id } | { page: "method" }. */
export function renderMain(route) {
  if (route.page === "method") return method();
  if (route.page === "experiment") return experiment(DATA.experiments.find((x) => x.id === route.id));
  return home();
}
export { headline, plain, md, esc, stats, sessionsOf };

/** Browser only: interactions on a page that is already fully rendered. */
export async function boot() {
  BASE = document.documentElement.dataset.base || BASE;
  // Content is visible without JavaScript; the "js" class (reveal and animations) is set only once this module runs.
  document.documentElement.classList.add("js");
  // Reveal and animations need no data: start them first, so the page never waits on data.json.
  observe();
  if (document.body.dataset.page === "home") initHero();
  // Old hash URLs (#001, #002, #method) keep working: they move to the experiment's own page.
  const h = location.hash.slice(1);
  if (h === "method") return location.replace(methodHref());
  try { DATA = await fetch(`${BASE}data.json`).then((r) => r.json()); } catch { DATA = null; }
  if (DATA && h) {
    const e = DATA.experiments.find((x) => x.id === h);
    if (e) return location.replace(expHref(e));
  }
  document.addEventListener("click", (ev) => {
    const c = ev.target.closest(".copy");
    if (c) {
      navigator.clipboard?.writeText(c.dataset.copy);
      c.innerHTML = `${svg(ICON.confirmed)}<span>Copied</span>`;
      setTimeout(() => (c.innerHTML = copyLabel), 1500);
      return;
    }
    if (ev.target.closest("[data-replay]")) { playRace($("[data-race]")); return; }
    const a = ev.target.closest("a[data-scroll]");
    if (a) { ev.preventDefault(); document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }); return; }
    const b = ev.target.closest(".seg button");
    if (b && DATA) {
      const e = DATA.experiments.find((x) => x.id === document.body.dataset.exp);
      if (!e) return;
      sessionIdx[e.id] = +b.dataset.s;
      const box = $("[data-results]");
      box.innerHTML = resultsBlock(e, sessionsOf(e), sessionIdx[e.id]);
      observe(box);
      $(`.seg button[data-s="${b.dataset.s}"]`, box)?.focus();
    }
  });
}
