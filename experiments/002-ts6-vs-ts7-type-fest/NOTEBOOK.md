# Lab #002 notebook

Times are UTC. Every command, anomaly and decision is logged here. No run is deleted: excluded runs stay in `results/` with the reason written below.

## 2026-11-10T19:30Z, Step 0: audit of the current state (no changes made)

### Files read
`README.md`, `METHOD.md`, `experiment.json`, `run.mjs`, the experiment `README.md`, `tools/bench.mjs`, `tools/build-index.mjs`, `docs/index.html`, `results/2026-11-03-linux-1cores.json`, `results/2026-11-09-darwin-12cores.json`.

### How the current numbers are produced
- `bench.mjs` runs each condition `RUNS` times in a row (no interleaving, no warm-up), wrapped in `/usr/bin/time -l` on macOS.
- `maxRssMB` comes from `/usr/bin/time -l`, "maximum resident set size". It is the peak RSS of the largest process in the tree, not the sum of the tree. For TypeScript 7.0.2, `bin/tsc` is a Node.js launcher that replaces itself with the native binary via `process.execve` (Node.js 22.15 or later), so the measured process is the native compiler. For TypeScript 6.0.3 it is the Node.js process.
- `memoryUsedKB` is the compiler's own "Memory used" line. For TypeScript 6 it reports the V8 heap; for TypeScript 7 it reports the native compiler's own figure. The two are not the same metric.
- The page recomputes medians from the raw runs (true median, mean of the two middle values for even counts). `bench.mjs` picks the upper middle value for even counts. With 3 runs both agree.
- The Intel Xeon session has no RSS (`maxRssMB` is null): `/usr/bin/time` was not available there.

### Stats of the existing data (check time, 3 runs each, CV = sample standard deviation / mean)

| Machine | Condition | Median | Min | Max | CV |
|---|---|---|---|---|---|
| Intel Xeon, 1 core, 4 GB (2026-11-03) | TS 6.0.3 | 6.68 s | 6.53 | 6.92 | 2.9% |
| | TS 7.0.2 default | 1.612 s | 1.593 | 1.704 | 3.6% |
| | TS 7.0.2 single-threaded | 1.674 s | 1.612 | 1.803 | 5.7% |
| Apple M3 Pro, 12 cores, 36 GB (2026-11-09) | TS 6.0.3 | 2.19 s | 1.98 | 3.26 | 27.7% |
| | TS 7.0.2 default | 0.549 s | 0.522 | 0.553 | 3.1% |
| | TS 7.0.2 single-threaded | 0.705 s | 0.699 | 0.726 | 2.0% |
| | TS 7.0.2 full suite | 16.5 s | 14.4 | 18.6 | 12.5% |

Gain split from these medians: M3 Pro total 3.99, native 3.11, parallel 1.28. Xeon total 4.14, native 3.99, parallel 1.04.

### Claims on the #002 page

| # | Claim (where) | Mark | Evidence |
|---|---|---|---|
| 1 | Status "Open question" | SUPPORTED at the time | Only 3 runs per condition, TS 6 spread 27.7% CV on the M3 Pro, full-suite TS 6 failure cause unknown. |
| 2 | Verdict: "Open until measured on more machines" | CONTRADICTED in part | Two machines are measured. What is missing is stable data and the cause of the TS 6 failure, not more machines. |
| 3 | Verdict: "In the reference environment (1 core, 4 GB), TypeScript 7 checked the library sources about 3 times faster" | CONTRADICTED | Xeon medians: 6.68 / 1.612 = 4.14x. |
| 4 | Verdict: "with lower memory" | NOT MEASURED | On the Xeon there is no RSS. The only memory figures are each compiler's own "Memory used" line (TS 6 V8 heap 361 MB vs TS 7 reported 270 MB), which are different metrics and cannot be compared. |
| 5 | Verdict: "the full suite with type tests ran out of memory with both compilers" | SUPPORTED on the Xeon only, CONTRADICTED on the M3 Pro | On the M3 Pro, TS 7 completed the full suite (median 16.5 s); only TS 6 failed. The page shows the Xeon wording as the general verdict. |
| 6 | Takeaway: "the gain depends on cores and memory, not just on the compiler" | CONTRADICTED as worded | Most of the gain is the native compiler (3.11x on the M3 Pro, 3.99x on the Xeon). Parallel checking adds 1.28x on 12 cores and 1.04x on 1 core. Cores matter, but the compiler is the main factor. Memory is only shown to matter for the full suite. |
| 7 | Hero number "4.0x faster check of the sources, TypeScript 7 vs 6" | SUPPORTED as a point value, weak | 2.19 / 0.549 = 3.99. But the TS 6 median rests on 3 runs with 27.7% CV (1.98 s to 3.26 s); the conservative range is 1.98/0.553 = 3.6x to 3.26/0.522 = 6.2x. |
| 8 | Chart "4.1x faster" (Xeon), "4.0x faster" (M3 Pro) | SUPPORTED as point values | 4.14 and 3.99. Same caveat on the M3 Pro TS 6 spread. |
| 9 | Hero caption "Computed from medians on Apple M3 Pro, 12 cores, 36 GB, 9 November 2026" | SUPPORTED | Matches the session. |
| 10 | Label "Out of memory (36 GB)" / "(4 GB)" on failed conditions | NOT MEASURED, misleading | The page builds it from the machine's RAM. `bench.mjs` tags any run with "heap out of memory" in its output, a signal, or exit 137 as out-of-memory, and stores no error text. TS 6 on the M3 Pro most likely hit the V8 heap limit (4,345,298,944 bytes by default with Node.js 22.23.3 here), not 36 GB of RAM. To be confirmed in Step 5. |
| 11 | Table "Memory" column | MIXED METRIC | The page shows `peakMemoryKB` if present, otherwise the median of `memoryUsedKB` (the compiler's own line). For TS 6 that is the V8 heap, for TS 7 the native report. RSS (`maxRssMB`) is recorded but not shown. The column header does not say which metric. |
| 12 | "Counters were identical across runs of each condition" (table caption) | CONTRADICTED | M3 Pro TS 7 full suite: Types 15,320,786 / 15,320,708 / 15,320,708 and Instantiations 38,893,816 / 38,893,686 / 38,893,686 differ between runs (Files identical, 653). |
| 13 | Limits: "compare conditions within the same machine only" | SUPPORTED | |
| 14 | Limits note: counters differ between TS 6 and 7 | SUPPORTED | |
| 15 | Setup "Command: tsc --extendedDiagnostics, 3 runs per condition" | SUPPORTED | No warm-up, not interleaved; the page does not claim either. |

### Known issues from the brief
- a. Confirmed. Verdict says "about 3 times" and "both compilers" out of memory; data say 4.14x (Xeon), 3.99x (M3 Pro) and TS 7 completed the full suite on the M3 Pro.
- b. Confirmed. Native 3.11x, parallel 1.28x on 12 cores (from the old 3-run data, to be re-measured).
- c. Plausible, not yet proven. The failure text was not stored. Step 5 will capture it.
- d. Confirmed. TS 6 source check 1.98 s to 3.26 s, CV 27.7%. The first run (3.26 s) is the slowest, consistent with a cold file system cache, since `bench.mjs` has no warm-up.

### New anomaly found during the audit
- A1. TS 7.0.2 full suite on the M3 Pro: Types and Instantiations are not identical across runs (see claim 12). The sources conditions are stable. Possible cause: non-deterministic counting with parallel checkers. Under the stability rule this must be reported; it will be re-checked in Step 5, including with `--singleThreaded` if it reproduces.

### Environment check before measuring (2026-11-10T19:30Z)
- Apple M3 Pro, 12 cores (6 performance + 6 efficiency), 36 GB, macOS 26.2 (25C56), Node.js v22.23.3.
- Power: on battery (77%, discharging). Low Power Mode: off. No thermal or performance warning recorded.
- Load average about 2.5. Open: WebStorm, a `next-server` (Next.js 16.1.4 dev server), a virtualization VM process, several Claude sessions, TaskWake, Grok Bot.
- Decision: do not measure on battery with this load. Waiting for Martin to plug in and close heavy applications.
- `tsc --help --all` (TS 7.0.2) lists `--checkers` ("Set the number of checkers per project."): Step 4 is possible.

## 2026-11-10T19:36Z, tooling changes (no change to default behavior)
- `tools/bench.mjs`: `bench()` untouched. Added opt-in `powerState()`, `runOnce()` and `benchProtocol()`. Protocol mode runs discarded warm-ups first, can interleave conditions (A B C A B C ...), idles before each series, stores every run with its start time, stores warm-ups as `warmupDiscarded`, uses a true median, and on failure stores the exit code, signal, peak RSS and the error lines instead of only a status.
- `run.mjs`: new env options `INTERLEAVE`, `WARMUP`, `CONDITIONS`, `SERIES`, `COOLDOWN`, `REQUIRE_AC`. Without them it runs exactly as before. New conditions only reachable through `CONDITIONS`: `src-ts7-c1/c2/c4/c8` (`--checkers N`), `full-ts7-single`, `full-ts6-heap16g` (`NODE_OPTIONS=--max-old-space-size=16384`).
- Smoke test: `CONDITIONS=src-ts7,src-ts7-c2 RUNS=1 WARMUP=0 COOLDOWN=0 SERIES=smoke`. Harness worked (0.48 s, 0.507 s). This was a tooling test on battery, not a measurement: its file was moved out of `results/` and is not used.

## 2026-11-10T19:38Z, measurement plan (Apple M3 Pro)
Martin's decision: machine on AC power, other applications stay open (WebStorm, Next.js dev server, a VM, Claude sessions). They are recorded here and in the limits. Every series uses `REQUIRE_AC=1` (the series does not start on battery), `COOLDOWN=120`, `WARMUP=1` (one discarded warm-up per condition) and `INTERLEAVE=1`, and records power source, Low Power Mode and load average before and after.

| Series | Command (from the repository root) | Purpose |
|---|---|---|
| S1 sources | `CONDITIONS=src-ts6,src-ts7,src-ts7-single RUNS=7 SERIES=sources` | Step 2 |
| S2 checkers | `CONDITIONS=src-ts7-c1,src-ts7-c2,src-ts7-c4,src-ts7-c8 RUNS=5 SERIES=checkers` | Step 4 |
| S3 TS 6 default heap | `CONDITIONS=full-ts6 RUNS=1 WARMUP=0 SERIES=full-ts6-default-heap` | Step 5.3, one diagnostic run to capture the error. No warm-up: it is expected to fail. |
| S4 full suite | `CONDITIONS=full-ts7,full-ts6-heap16g,full-ts7-single RUNS=3 SERIES=full` | Steps 5.2 and 5.4, plus `full-ts7-single` to investigate anomaly A1 (counters unstable across runs with parallel checking). |

All with the prefix `REQUIRE_AC=1 INTERLEAVE=1 WARMUP=1 COOLDOWN=120 node experiments/002-ts6-vs-ts7-type-fest/run.mjs` unless overridden above. Full log: `experiments/002-ts6-vs-ts7-type-fest/results/2026-11-10-series.log`.
