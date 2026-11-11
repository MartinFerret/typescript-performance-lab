// Computes every number reported for Lab #002 from the raw runs in results/.
// node experiments/002-ts6-vs-ts7-type-fest/analyze.mjs            human-readable tables
// node experiments/002-ts6-vs-ts7-type-fest/analyze.mjs --json     the same, as JSON (used by tools/build-index.mjs)
//
// Definitions
// - median: middle value, mean of the two middle values for an even count
// - IQR: Q3 - Q1, quartiles by linear interpolation between order statistics (the "type 7" method)
// - CV: sample standard deviation / mean
// - gains: ratios of medians. Conservative range of A/B: min(A)/max(B) to max(A)/min(B)
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const quantile = (sorted, q) => {
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};
export function describe(values) {
  const v = values.filter((x) => x != null);
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b), n = s.length;
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, median: quantile(s, 0.5), min: s[0], max: s[n - 1], q1: quantile(s, 0.25), q3: quantile(s, 0.75), iqr: quantile(s, 0.75) - quantile(s, 0.25), mean, cv: sd / mean };
}
const ratio = (a, b) => ({ value: a.median / b.median, low: a.min / b.max, high: a.max / b.min });

export function loadSessions() {
  const dir = path.join(here, "results");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, ...JSON.parse(readFileSync(path.join(dir, f), "utf8")) }));
}

function conditionStats(c) {
  const runs = c.runs ?? [];
  const same = (k) => new Set(runs.map((r) => r[k])).size <= 1;
  return {
    key: c.key, label: c.label, status: c.status, runs: runs.length,
    check: describe(runs.map((r) => r.checkTime)), total: describe(runs.map((r) => r.totalTime)),
    rssMB: describe(runs.map((r) => r.maxRssMB)), reportedMemoryMB: describe(runs.map((r) => (r.memoryUsedKB != null ? r.memoryUsedKB / 1024 : null))),
    stable: { files: same("files"), types: same("types"), instantiations: same("instantiations") },
    counters: runs.length ? { files: [...new Set(runs.map((r) => r.files))], types: [...new Set(runs.map((r) => r.types))], instantiations: [...new Set(runs.map((r) => r.instantiations))] } : null,
    failure: c.failure ?? null, env: c.env ?? {}, warmups: (c.warmupDiscarded ?? []).length,
  };
}

/** Pools the runs of one condition key across the given sessions (e.g. a series and its follow-up runs). */
function pooled(sessions, key) {
  const cs = sessions.flatMap((s) => s.conditions.filter((c) => c.key === key));
  if (!cs.length) return null;
  const ok = cs.filter((c) => c.status === "ok");
  return conditionStats(ok.length ? { ...ok[0], runs: ok.flatMap((c) => c.runs) } : cs[0]);
}

function decomposition(get) {
  const a = get("src-ts6"), single = get("src-ts7-single"), def = get("src-ts7");
  if (![a, single, def].every((x) => x?.check)) return null;
  const native = ratio(a.check, single.check), parallel = ratio(single.check, def.check), total = ratio(a.check, def.check);
  return { native, parallel, total, productCheck: native.value * parallel.value };
}

export function analyze() {
  const sessions = loadSessions();
  const machines = {};
  for (const s of sessions) {
    const id = `${s.environment.cpu}|${s.environment.cores}`;
    (machines[id] ??= { environment: s.environment, sessions: [] }).sessions.push(s);
  }
  return Object.values(machines).map((m) => {
    // Protocol sessions (with warm-up and interleaving) supersede older plain sessions for the same condition.
    const proto = m.sessions.filter((s) => s.protocol);
    const base = proto.length ? proto : m.sessions;
    const keys = [...new Set(base.flatMap((s) => s.conditions.map((c) => c.key)))];
    const conditions = Object.fromEntries(keys.map((k) => [k, pooled(base.filter((s) => s.conditions.some((c) => c.key === k)), k)]));
    return { machine: m.environment, files: base.map((s) => s.file), protocol: proto.length > 0, conditions, decomposition: decomposition((k) => conditions[k]) };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = analyze();
  if (process.argv.includes("--json")) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
  const f = (x, d = 3) => (x == null ? "n/a" : x.toFixed(d));
  for (const m of out) {
    console.log(`\n## ${m.machine.cpu}, ${m.machine.cores} cores, ${m.machine.memoryGB} GB (${m.files.join(", ")})`);
    console.log("key".padEnd(18), "n  median    min     max     IQR     CV%   | total med  CV%  | RSS MB med (min-max) | stable");
    for (const c of Object.values(m.conditions)) {
      if (!c.check) { console.log(c.key.padEnd(18), c.status, c.failure ? JSON.stringify({ exit: c.failure.exitCode, signal: c.failure.signal, cause: c.failure.cause, rss: c.failure.maxRssMB, err: c.failure.errorLines?.slice(0, 3) }) : ""); continue; }
      const st = Object.values(c.stable).every(Boolean) ? "yes" : `NO ${JSON.stringify(c.counters)}`;
      console.log(c.key.padEnd(18), String(c.runs).padEnd(2), f(c.check.median).padStart(7), f(c.check.min).padStart(7), f(c.check.max).padStart(7), f(c.check.iqr).padStart(7), f(c.check.cv * 100, 1).padStart(6), "|", f(c.total.median).padStart(8), f(c.total.cv * 100, 1).padStart(5), "|", c.rssMB ? `${f(c.rssMB.median, 0)} (${f(c.rssMB.min, 0)}-${f(c.rssMB.max, 0)})` : "n/a", "|", st);
    }
    const d = m.decomposition;
    if (d) for (const k of ["native", "parallel", "total"]) console.log(`  ${k.padEnd(8)} ${f(d[k].value, 3)}x  (conservative ${f(d[k].low, 2)} to ${f(d[k].high, 2)})`);
    if (d) console.log(`  native x parallel = ${f(d.productCheck, 3)} vs total ${f(d.total.value, 3)}`);
  }
}

// ---------------------------------------------------------------------------
// Tokens used in experiment.json texts ({{name}}), filled by tools/build-index.mjs.
// Rounding: factors one decimal, times three significant digits, memory in GiB with one decimal
// (/usr/bin/time reports bytes; 1 GiB = 1024 MiB), percentages one decimal.
const X = (v) => `${v.toFixed(1)}×`;
const S = (v) => `${Number(v.toPrecision(3))} s`;
const GiB = (mib) => `${(mib / 1024).toFixed(1)} GiB`;
const PCT = (v) => `${(v * 100).toFixed(1)}%`;
const RANGE = (r) => `${r.low.toFixed(1)}× to ${r.high.toFixed(1)}×`;

export function tokens(analysis = analyze()) {
  const t = {};
  const m3 = analysis.find((m) => /M3/.test(m.machine.cpu));
  const xeon = analysis.find((m) => /Xeon/.test(m.machine.cpu));
  const put = (prefix, m) => {
    const d = m?.decomposition, c = m?.conditions ?? {};
    if (d) for (const k of ["total", "native", "parallel"]) { t[`${prefix}.${k}`] = X(d[k].value); t[`${prefix}.${k}.range`] = RANGE(d[k]); }
    if (c["src-ts6"]?.check) t[`${prefix}.ts6`] = S(c["src-ts6"].check.median);
    if (c["src-ts7"]?.check) t[`${prefix}.ts7`] = S(c["src-ts7"].check.median);
    if (c["src-ts7-single"]?.check) t[`${prefix}.ts7single`] = S(c["src-ts7-single"].check.median);
    if (m) t[`${prefix}.cores`] = String(m.machine.cores);
  };
  put("m3", m3);
  put("xeon", xeon);
  if (m3) {
    const c = m3.conditions;
    for (const n of [1, 2, 4, 8]) if (c[`src-ts7-c${n}`]?.check) t[`chk.c${n}`] = S(c[`src-ts7-c${n}`].check.median);
    const f6 = c["full-ts6-heap16g"], f7 = c["full-ts7"], f7s = c["full-ts7-single"];
    if (f6?.check && f7?.check) {
      t["full.ts6"] = S(f6.check.median); t["full.ts7"] = S(f7.check.median);
      t["full.total"] = X(f6.check.median / f7.check.median);
      t["full.rss.ts6"] = GiB(f6.rssMB.median); t["full.rss.ts7"] = GiB(f7.rssMB.median);
      t["full.cv.max"] = PCT(Math.max(...[f6, f7, f7s].filter(Boolean).map((x) => x.check.cv)));
    }
    if (f7s?.check) {
      t["full.ts7single"] = S(f7s.check.median); t["full.rss.ts7single"] = GiB(f7s.rssMB.median);
      if (f6?.check) t["full.native"] = X(f6.check.median / f7s.check.median);
      if (f7?.check) t["full.parallel"] = X(f7s.check.median / f7.check.median);
    }
    const big = c["full-ts6-heap16g"]?.env?.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1];
    if (big) t["heap.large"] = `${Number(big) / 1024} GiB`;
    const oom = c["full-ts6"]?.failure;
    if (oom?.maxRssMB) t["full.ts6.oom.rss"] = GiB(oom.maxRssMB);
    const sessions = loadSessions().filter((s) => s.protocol && /M3/.test(s.environment.cpu));
    const heap = sessions.find((s) => s.protocol.heapLimitBytes)?.protocol.heapLimitBytes;
    if (heap) t["heap.default"] = `${(heap / 2 ** 30).toFixed(1)} GiB`;
    const loads = sessions.flatMap((s) => [s.protocol.powerBefore?.loadAverage?.[0], s.protocol.powerAfter?.loadAverage?.[0]]).filter((v) => v != null);
    if (loads.length) { t["load.min"] = Math.min(...loads).toFixed(1); t["load.max"] = Math.max(...loads).toFixed(1); }
  }
  return t;
}
