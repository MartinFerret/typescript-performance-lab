// Re-measures Lab #002 on a quiet machine: one command, two series, then the analysis.
//   npm run lab:002:quiet
//
// 1. Checker series (sources): TypeScript 7.0.2 default, then --checkers 1, 2, 4, 8 and 12.
//    The default mode is in the same series, so "--checkers N vs default" is compared within one series.
// 2. Full suite: TypeScript 6.0.3 with a 16 GiB heap, TypeScript 7.0.2 default, TypeScript 7.0.2 single-threaded.
// Each series: one discarded warm-up per condition, conditions interleaved, 120 s idle first, AC power required.
//
// Before starting, the script waits until the 1-minute load average is below LOAD_MAX (default 1.5), for at most
// LOAD_WAIT_MIN minutes (default 15). If the machine is still busy, it stops and lists the busiest processes,
// unless FORCE=1. Close other applications before running it.
//
// Options: RUNS_CHECKERS (default 7), RUNS_FULL (default 7), LOAD_MAX, LOAD_WAIT_MIN, FORCE=1, SKIP_FULL=1.
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const day = new Date().toISOString().slice(0, 10);
const log = path.join(here, "results", `${day}-quiet.log`);
mkdirSync(path.dirname(log), { recursive: true });
const say = (line) => { console.log(line); appendFileSync(log, `${line}\n`); };

const loadMax = Number(process.env.LOAD_MAX ?? 1.5);
const waitMin = Number(process.env.LOAD_WAIT_MIN ?? 15);
say(`=== ${new Date().toISOString()} quiet re-measurement of Lab #002`);
const deadline = Date.now() + waitMin * 60_000;
while (os.loadavg()[0] >= loadMax && Date.now() < deadline) {
  say(`load average ${os.loadavg()[0].toFixed(2)} >= ${loadMax}, waiting...`);
  await new Promise((r) => setTimeout(r, 30_000));
}
if (os.loadavg()[0] >= loadMax) {
  const top = spawnSync("ps", ["-Ao", "%cpu,comm", "-r"], { encoding: "utf8" }).stdout?.split("\n").slice(0, 8).join("\n");
  say(`machine still busy (load ${os.loadavg()[0].toFixed(2)}). Busiest processes:\n${top}`);
  if (process.env.FORCE !== "1") { say("Stopped. Close them and run again, or set FORCE=1 (recorded in the results)."); process.exit(1); }
  say("FORCE=1: continuing on a busy machine.");
}

const series = [
  { name: "quiet-checkers", conditions: "src-ts7,src-ts7-c1,src-ts7-c2,src-ts7-c4,src-ts7-c8,src-ts7-c12", runs: process.env.RUNS_CHECKERS ?? "7" },
  ...(process.env.SKIP_FULL === "1" ? [] : [{ name: "quiet-full", conditions: "full-ts6-heap16g,full-ts7,full-ts7-single", runs: process.env.RUNS_FULL ?? "7" }]),
];
for (const s of series) {
  say(`\n=== ${new Date().toISOString()} series ${s.name}: ${s.conditions}, ${s.runs} runs each`);
  const child = spawnSync(process.execPath, [path.join(here, "run.mjs")], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CONDITIONS: s.conditions, RUNS: s.runs, SERIES: s.name, INTERLEAVE: "1", WARMUP: "1", COOLDOWN: process.env.COOLDOWN ?? "120", REQUIRE_AC: "1" },
  });
  say(`${child.stdout ?? ""}${child.stderr ?? ""}`.trim());
  if (child.status !== 0) { say(`series ${s.name} failed (exit ${child.status})`); process.exit(child.status ?? 1); }
}

const report = spawnSync(process.execPath, [path.join(here, "analyze.mjs")], { cwd: root, encoding: "utf8" });
say(`\n=== analysis\n${report.stdout}`);
say(`Done. Next: node tools/build-index.mjs, then review docs/data.json and NOTEBOOK.md before publishing.`);
