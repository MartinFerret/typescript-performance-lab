// Collects every experiments/*/experiment.json and results/*.json into docs/data.json.
//
// Sessions
// - Plain sessions (one results file = one run of run.mjs) are published as they are.
// - Protocol series (results files with a "protocol" block) are merged per machine and day into one session:
//   runs of the same condition across series are pooled. Each condition keeps the list of series it came from.
// - When a machine has protocol series, its older plain sessions are published under "supersededSessions"
//   (still in results/, still in data.json, but not shown as current results).
//
// Text
// - verdict, takeaway and notes may contain {{tokens}} filled from experiments/<lab>/analyze.mjs (export "tokens").
// - The build fails if a token is unknown, or if one of these texts contains a hand-written number with a unit
//   (×, x, s, ms, MB, GB, GiB, %): every number in them must come from the data.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "experiments");
const errors = [];

const machineId = (s) => `${s.environment.cpu}|${s.environment.cores}`;

function mergeSessions(raw) {
  const plain = raw.filter((s) => !s.protocol);
  const proto = raw.filter((s) => s.protocol);
  const protoMachines = new Set(proto.map(machineId));
  const groups = new Map();
  for (const s of proto) {
    const id = `${machineId(s)}|${s.date.slice(0, 10)}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(s);
  }
  const merged = [...groups.values()].map((list) => {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const conditions = [];
    for (const s of list) {
      for (const c of s.conditions) {
        const series = s.protocol.series ?? s.file;
        const prev = conditions.find((x) => x.key === c.key);
        if (!prev) { conditions.push({ ...c, series: [series] }); continue; }
        // Pool the runs; a failure in one series is never mixed with successful runs.
        if (prev.status === "ok" && c.status === "ok") {
          prev.runs = [...prev.runs, ...c.runs];
          prev.warmupDiscarded = [...(prev.warmupDiscarded ?? []), ...(c.warmupDiscarded ?? [])];
          prev.series.push(series);
          delete prev.median; // readers recompute medians from the pooled runs
        } else errors.push(`${list[0].file}: condition ${c.key} mixes a failure and a success across series`);
      }
    }
    const last = list[list.length - 1];
    return {
      date: last.date,
      environment: last.environment,
      runsPerCondition: Math.max(...conditions.map((c) => c.runs?.length ?? 0)),
      target: last.target,
      protocol: {
        warmupDiscarded: list.every((s) => s.protocol.warmupDiscarded || s.protocol.warmupPerCondition === 0),
        interleaved: list.every((s) => s.protocol.interleaved),
        heapLimitBytes: last.protocol.heapLimitBytes,
        series: list.map((s) => ({ file: s.file, ...s.protocol })),
      },
      conditions,
    };
  });
  return {
    sessions: [...plain.filter((s) => !protoMachines.has(machineId(s))), ...merged].sort((a, b) => a.date.localeCompare(b.date)),
    supersededSessions: plain.filter((s) => protoMachines.has(machineId(s))),
  };
}

const UNIT_NUMBER = /\d(?:[\d,.]*\d)?\s?(?:×|x\b|ms\b|s\b|MB\b|GB\b|GiB\b|%)/;
const warnings = [];
function fillTokens(name, field, text, tokens, strict) {
  if (typeof text !== "string") return text;
  const m = text.replace(/\{\{[^}]+\}\}/g, "").match(UNIT_NUMBER);
  if (m) (strict ? errors : warnings).push(`${name} ${field}: hand-written number "${m[0]}". Use a {{token}} computed from the data.`);
  return text.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
    if (!(k in tokens)) { errors.push(`${name} ${field}: unknown token {{${k}}}`); return `{{${k}}}`; }
    return tokens[k];
  });
}

const experiments = [];
for (const name of readdirSync(dir).filter((n) => existsSync(path.join(dir, n, "experiment.json"))).sort()) {
  const meta = JSON.parse(readFileSync(path.join(dir, name, "experiment.json"), "utf8"));
  const resultsDir = path.join(dir, name, "results");
  const raw = existsSync(resultsDir)
    ? readdirSync(resultsDir).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, ...JSON.parse(readFileSync(path.join(resultsDir, f), "utf8")) }))
    : [];
  const { sessions, supersededSessions } = mergeSessions(raw);
  const analyzer = path.join(dir, name, "analyze.mjs");
  let tokens = {}, analysis = null;
  if (existsSync(analyzer)) {
    const mod = await import(pathToFileURL(analyzer).href);
    if (mod.analyze) analysis = mod.analyze();
    if (mod.tokens) tokens = mod.tokens(analysis);
  }
  const filled = { ...meta };
  // Experiments with an analyzer must take every number from it; the others only get a warning.
  const strict = existsSync(analyzer);
  for (const field of ["verdict", "takeaway"]) filled[field] = fillTokens(name, field, meta[field], tokens, strict);
  if (Array.isArray(meta.notes)) filled.notes = meta.notes.map((n, i) => fillTokens(name, `notes[${i}]`, n, tokens, strict));
  experiments.push({ folder: name, ...filled, sessions, ...(supersededSessions.length ? { supersededSessions } : {}), ...(analysis ? { analysis } : {}) });
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  console.error(`docs/data.json NOT written:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
writeFileSync(path.join(root, "docs/data.json"), JSON.stringify({ generatedAt: new Date().toISOString(), experiments }, null, 2));
console.log(`docs/data.json written with ${experiments.length} experiments`);
