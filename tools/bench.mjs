// Runs tsc several times on a project and returns parsed --extendedDiagnostics metrics.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const compilers = {
  ts6: { label: "TypeScript 6.0.3", bin: path.join(root, "node_modules/typescript6/bin/tsc") },
  ts7: { label: "TypeScript 7.0.2", bin: path.join(root, "node_modules/typescript7/bin/tsc") },
};

const METRICS = {
  Files: "files",
  Lines: "lines",
  Types: "types",
  Instantiations: "instantiations",
  "Memory used": "memoryUsedKB",
  "Parse time": "parseTime",
  "Bind time": "bindTime",
  "Check time": "checkTime",
  "Total time": "totalTime",
};

function parse(output) {
  const result = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Za-z ]+):\s+([\d.]+)(K|s)?\s*$/);
    if (match && METRICS[match[1].trim()]) result[METRICS[match[1].trim()]] = Number(match[2]);
  }
  const mac = output.match(/(\d+)\s+maximum resident set size/);
  const linux = output.match(/Maximum resident set size \(kbytes\):\s+(\d+)/);
  if (mac) result.maxRssMB = Math.round(Number(mac[1]) / 1048576);
  if (linux) result.maxRssMB = Math.round(Number(linux[1]) / 1024);
  return result;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

export function environment() {
  return {
    cpu: os.cpus()[0]?.model.trim() ?? "unknown",
    cores: os.cpus().length,
    memoryGB: Math.round(os.totalmem() / 1073741824),
    platform: `${os.type()} ${os.release()}`,
    node: process.version,
  };
}

export function bench({ compiler, project, cwd, runs = 3, flags = [], label, scope }) {
  const tsc = compilers[compiler];
  const args = [tsc.bin, "-p", project, "--extendedDiagnostics", ...flags];
  const timeBin = "/usr/bin/time";
  const timeFlag = process.platform === "darwin" ? "-l" : "-v";
  const useTime = existsSync(timeBin);
  const results = [];
  for (let run = 1; run <= runs; run++) {
    const command = useTime ? [timeBin, timeFlag, process.execPath, ...args] : [process.execPath, ...args];
    process.stdout.write(`  ${label}: run ${run}/${runs}... `);
    const child = spawnSync(command[0], command.slice(1), {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? "" },
    });
    const output = `${child.stdout ?? ""}\n${child.stderr ?? ""}`;
    const metrics = parse(output);
    if (metrics.checkTime === undefined) {
      const killed = child.signal || child.status === 137 || /heap out of memory/i.test(output);
      console.log(killed ? "failed (killed, likely out of memory)" : "failed");
      return { label, compiler: tsc.label, scope, flags, status: killed ? "out-of-memory" : "failed", runs: results };
    }
    console.log(`check ${metrics.checkTime}s`);
    results.push(metrics);
  }
  const keys = Object.keys(results[0]);
  const med = Object.fromEntries(keys.map((key) => [key, median(results.map((r) => r[key]))]));
  return { label, compiler: tsc.label, scope, flags, status: "ok", runs: results, median: med };
}

// ---------------------------------------------------------------------------
// Protocol mode (opt-in, used by experiments that set INTERLEAVE=1 or WARMUP=n).
// bench() above is unchanged and stays the default.

/** Power source and Low Power Mode on macOS, so every series records them. */
export function powerState() {
  if (process.platform !== "darwin") return null;
  const batt = spawnSync("pmset", ["-g", "batt"], { encoding: "utf8" }).stdout ?? "";
  const all = spawnSync("pmset", ["-g"], { encoding: "utf8" }).stdout ?? "";
  return {
    source: /AC Power/.test(batt) ? "AC" : /Battery Power/.test(batt) ? "battery" : "unknown",
    lowPowerMode: /lowpowermode\s+1/.test(all),
    loadAverage: os.loadavg().map((v) => Number(v.toFixed(2))),
  };
}

/** One tsc run. Returns metrics, or a failure with the exit code, signal and the error lines. */
export function runOnce({ compiler, project, cwd, flags = [], env = {} }) {
  const tsc = compilers[compiler];
  const args = [tsc.bin, "-p", project, "--extendedDiagnostics", ...flags];
  const useTime = existsSync("/usr/bin/time");
  const command = useTime ? ["/usr/bin/time", process.platform === "darwin" ? "-l" : "-v", process.execPath, ...args] : [process.execPath, ...args];
  const started = new Date().toISOString();
  const child = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? "", ...env },
  });
  const output = `${child.stdout ?? ""}\n${child.stderr ?? ""}`;
  const metrics = parse(output);
  if (metrics.checkTime !== undefined) return { ok: true, started, metrics };
  const lines = output.split("\n").filter((l) => l.trim());
  const errorLines = lines.filter((l) => /error|fatal|heap|memory|abort|killed|panic|signal/i.test(l) && !/maximum resident|page reclaims|page faults/i.test(l)).slice(0, 12);
  // /usr/bin/time exits with the child's status; a signal shows up as "terminated by signal" or exit > 128.
  const signal = child.signal ?? (output.match(/signal (\d+)/i)?.[1] ? `signal ${output.match(/signal (\d+)/i)[1]}` : null);
  const heap = /JavaScript heap out of memory|Reached heap limit/i.test(output);
  return {
    ok: false,
    started,
    status: heap ? "out-of-memory" : "failed",
    cause: heap ? "v8-heap-limit" : signal ? "signal" : "error",
    exitCode: child.status,
    signal,
    maxRssMB: metrics.maxRssMB ?? null,
    errorLines,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// True median (mean of the two middle values for an even count), as the notebook page computes it.
const trueMedian = (values) => { const s = [...values].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/**
 * Runs several conditions with discarded warm-ups, optionally interleaved (A B C A B C ...).
 * steps: [{ key, compiler, project, flags, env, label, scope }]
 * Returns condition objects in the same shape as bench(), plus warmup, order and failure details.
 */
export async function benchProtocol({ steps, cwd, runs, warmup = 1, interleave = true, cooldownSeconds = 120, log = console.log }) {
  const state = Object.fromEntries(steps.map((s) => [s.key, { step: s, runs: [], warmup: [], failure: null }]));
  if (cooldownSeconds > 0) { log(`  idle ${cooldownSeconds} s before the series`); await sleep(cooldownSeconds * 1000); }
  const one = (s, kind, i, total) => {
    const st = state[s.key];
    if (st.failure) return;
    const r = runOnce({ ...s, cwd });
    const tag = `${s.label}: ${kind} ${i}/${total}`;
    if (!r.ok) {
      st.failure = r;
      log(`  ${tag}... FAILED (${r.status}, exit ${r.exitCode}${r.signal ? `, ${r.signal}` : ""})`);
      return;
    }
    (kind === "warm-up" ? st.warmup : st.runs).push({ ...r.metrics, started: r.started });
    log(`  ${tag}... check ${r.metrics.checkTime}s${r.metrics.maxRssMB ? `, rss ${r.metrics.maxRssMB} MB` : ""}`);
  };
  for (let w = 1; w <= warmup; w++) for (const s of steps) one(s, "warm-up", w, warmup);
  if (interleave) { for (let i = 1; i <= runs; i++) for (const s of steps) one(s, "run", i, runs); }
  else for (const s of steps) for (let i = 1; i <= runs; i++) one(s, "run", i, runs);
  return steps.map((s) => {
    const st = state[s.key];
    const base = { key: s.key, label: s.label, compiler: compilers[s.compiler].label, scope: s.scope, flags: s.flags ?? [], env: s.env ?? {}, warmupDiscarded: st.warmup };
    if (st.failure) return { ...base, status: st.failure.status, failure: st.failure, runs: st.runs };
    const keys = Object.keys(st.runs[0]).filter((k) => k !== "started");
    const med = Object.fromEntries(keys.map((k) => [k, trueMedian(st.runs.map((r) => r[k]).filter((v) => v != null))]));
    return { ...base, status: "ok", runs: st.runs, median: med };
  });
}
