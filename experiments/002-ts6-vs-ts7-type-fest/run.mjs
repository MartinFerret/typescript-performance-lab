import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bench, benchProtocol, environment, powerState } from "../../tools/bench.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const { target } = JSON.parse(readFileSync(path.join(here, "experiment.json"), "utf8"));
const work = path.join(here, "work", target.name);
const runs = Number(process.env.RUNS ?? 3);
const skipFull = process.env.SKIP_FULL === "1";
// Protocol options (opt-in; without them the script behaves as before):
//   INTERLEAVE=1      run conditions in turn (A B C A B C ...) instead of all runs of one condition in a row
//   WARMUP=n          n discarded warm-up runs per condition, kept in the results file as warmupDiscarded
//   CONDITIONS=a,b    only these condition keys, in this order (also unlocks the extra conditions below)
//   SERIES=name       suffix for the results file, so several series on one day do not overwrite each other
//   COOLDOWN=s        idle seconds before the series (default 120 in protocol mode)
//   REQUIRE_AC=1      macOS: wait until the machine is on AC power before starting
const protocol = process.env.INTERLEAVE === "1" || process.env.WARMUP !== undefined || process.env.CONDITIONS !== undefined;
const only = process.env.CONDITIONS?.split(",").map((s) => s.trim()).filter(Boolean);

if (!existsSync(work)) {
  console.log(`Cloning ${target.name} at ${target.commit}...`);
  execSync(`git clone --quiet ${target.repository} "${work}"`, { stdio: "inherit" });
  execSync(`git checkout --quiet ${target.commit}`, { cwd: work, stdio: "inherit" });
  execSync("npm install --ignore-scripts --silent", { cwd: work, stdio: "inherit" });
}
writeFileSync(
  path.join(work, "tsconfig.src.json"),
  JSON.stringify({ extends: "./tsconfig.json", include: ["index.d.ts", "source/**/*.d.ts"] }, null, 2),
);

const plan = [
  { key: "src-ts6", compiler: "ts6", project: "tsconfig.src.json", label: "Sources, TypeScript 6.0.3", scope: "sources" },
  { key: "src-ts7", compiler: "ts7", project: "tsconfig.src.json", label: "Sources, TypeScript 7.0.2", scope: "sources" },
  { key: "src-ts7-single", compiler: "ts7", project: "tsconfig.src.json", flags: ["--singleThreaded"], label: "Sources, TypeScript 7.0.2 single-threaded", scope: "sources" },
  { key: "full-ts6", compiler: "ts6", project: "tsconfig.json", label: "Full suite with type tests, TypeScript 6.0.3", scope: "full" },
  { key: "full-ts7", compiler: "ts7", project: "tsconfig.json", label: "Full suite with type tests, TypeScript 7.0.2", scope: "full" },
];
// Extra conditions, only run when listed in CONDITIONS.
const extra = [
  ...[1, 2, 4, 8].map((n) => ({ key: `src-ts7-c${n}`, compiler: "ts7", project: "tsconfig.src.json", flags: ["--checkers", String(n)], label: `Sources, TypeScript 7.0.2 with ${n} ${n === 1 ? "checker" : "checkers"}`, scope: "checkers" })),
  { key: "full-ts7-single", compiler: "ts7", project: "tsconfig.json", flags: ["--singleThreaded"], label: "Full suite with type tests, TypeScript 7.0.2 single-threaded", scope: "full" },
  { key: "full-ts6-heap16g", compiler: "ts6", project: "tsconfig.json", env: { NODE_OPTIONS: "--max-old-space-size=16384" }, label: "Full suite with type tests, TypeScript 6.0.3, 16 GB heap", scope: "full" },
];

let conditions = [];
let protocolInfo;
if (!protocol) {
  for (const step of plan) {
    if (skipFull && step.scope === "full") continue;
    conditions.push({ key: step.key, ...bench({ ...step, cwd: work, runs }) });
  }
} else {
  const all = [...plan, ...extra];
  const steps = only ? only.map((k) => all.find((s) => s.key === k) ?? (() => { throw new Error(`Unknown condition ${k}`); })()) : plan.filter((s) => !(skipFull && s.scope === "full"));
  if (process.env.REQUIRE_AC === "1") {
    while (powerState()?.source !== "AC") { console.log("Waiting for AC power..."); await new Promise((r) => setTimeout(r, 30000)); }
  }
  const warmup = Number(process.env.WARMUP ?? 1);
  const interleave = process.env.INTERLEAVE === "1";
  const cooldownSeconds = Number(process.env.COOLDOWN ?? 120);
  const powerBefore = powerState();
  const startedAt = new Date().toISOString();
  conditions = await benchProtocol({ steps, cwd: work, runs, warmup, interleave, cooldownSeconds });
  protocolInfo = { warmupPerCondition: warmup, warmupDiscarded: warmup > 0, interleaved: interleave, cooldownSeconds, startedAt, finishedAt: new Date().toISOString(), powerBefore, powerAfter: powerState(), heapLimitBytes: (await import("node:v8")).getHeapStatistics().heap_size_limit, series: process.env.SERIES ?? null };
}

const session = { date: new Date().toISOString(), environment: environment(), runsPerCondition: runs, target, ...(protocolInfo ? { protocol: protocolInfo } : {}), conditions };
mkdirSync(path.join(here, "results"), { recursive: true });
const suffix = process.env.SERIES ? `-${process.env.SERIES.replace(/[^a-z0-9-]/gi, "")}` : "";
const file = path.join(here, "results", `${session.date.slice(0, 10)}-${process.platform}-${session.environment.cores}cores${suffix}.json`);
writeFileSync(file, JSON.stringify(session, null, 2));
console.log(`\nSaved ${path.relative(process.cwd(), file)}`);
