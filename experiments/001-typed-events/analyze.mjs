// Computes every number reported for Lab #001 from the raw runs in results/.
// node experiments/001-typed-events/analyze.mjs   human-readable table
// Cut = 1 - median(after) / median(before), per compiler and per machine. Conservative range from the fastest
// and slowest runs: 1 - max(after)/min(before) to 1 - min(after)/max(before).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe } from "../../tools/stats.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

export function loadSessions() {
  const dir = path.join(here, "results");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, ...JSON.parse(readFileSync(path.join(dir, f), "utf8")) }));
}

export function analyze() {
  return loadSessions().map((s) => {
    const check = (key) => describe((s.conditions.find((c) => c.key === key)?.runs ?? []).map((r) => r.checkTime));
    const cuts = {};
    for (const v of ["6", "7"]) {
      const b = check(`before-ts${v}`), a = check(`after-ts${v}`);
      if (b && a) cuts[`ts${v}`] = { value: 1 - a.median / b.median, low: 1 - a.max / b.min, high: 1 - a.min / b.max, before: b, after: a };
    }
    return { machine: s.environment, file: s.file, safetyCheck: s.safetyCheck ?? null, cuts };
  });
}

const PCT = (v) => `${Math.round(v * 100)}%`;
export function tokens(analysis = analyze()) {
  const t = {};
  for (const [prefix, re] of [["m3", /M3/], ["xeon", /Xeon/]]) {
    const m = analysis.find((x) => re.test(x.machine.cpu));
    if (!m) continue;
    t[`${prefix}.cores`] = String(m.machine.cores);
    for (const [k, c] of Object.entries(m.cuts)) { t[`${prefix}.${k}.cut`] = PCT(c.value); t[`${prefix}.${k}.cut.range`] = `${PCT(c.low)} to ${PCT(c.high)}`; t[`${prefix}.${k}.after.cv`] = `${(c.after.cv * 100).toFixed(1)}%`; t[`${prefix}.${k}.after.min`] = `${Number(c.after.min.toPrecision(3))} s`; t[`${prefix}.${k}.after.max`] = `${Number(c.after.max.toPrecision(3))} s`; }
    t[`${prefix}.runs`] = String(Math.min(...Object.values(m.cuts).flatMap((c) => [c.before.n, c.after.n])));
  }
  return t;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const m of analyze()) {
    console.log(`\n## ${m.machine.cpu}, ${m.machine.cores} cores (${m.file}), safety check ${m.safetyCheck}`);
    for (const [k, c] of Object.entries(m.cuts)) console.log(`  ${k}: before ${c.before.median} s (CV ${(c.before.cv * 100).toFixed(1)}%), after ${c.after.median} s (CV ${(c.after.cv * 100).toFixed(1)}%), cut ${(c.value * 100).toFixed(1)}% (conservative ${(c.low * 100).toFixed(1)}% to ${(c.high * 100).toFixed(1)}%)`);
  }
  console.log(tokens());
}
