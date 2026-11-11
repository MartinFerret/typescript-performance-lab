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

## 2026-11-11T09:06Z, launch
- 2026-11-10T19:38Z to 2026-11-11T09:05Z: the first launch waited for AC power the whole time (`REQUIRE_AC=1`) and never measured anything. Its log, `results/2026-11-10-series.log`, contains only "Waiting for AC power...". Stopped.
- Martin asked to measure even on battery. The `REQUIRE_AC` condition is removed from the series; every series still records the power source, Low Power Mode and load average before and after it, in its results file (`protocol.powerBefore` / `powerAfter`).
- State at launch: `pmset` reports AC Power (charging, 55%), Low Power Mode off, load average 5.65 / 4.14 / 3.59 (just after two site builds). Same applications open as recorded on 2026-11-10. Each series idles 120 s first.
- Log: `results/2026-11-11-series.log`.

## 2026-11-11T09:23Z, first results (all four series done, AC power throughout, Low Power Mode off)
- S1 sources: CV 0.8% (TS 6), 1.3% (TS 7), 0.9% (TS 7 single-threaded). Below 5%, no extra runs. Counters identical across runs.
- S2 checkers: CV 1.7% to 2.6%. Counters identical across runs.
- S3 TS 6 default heap: failed with `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`, SIGABRT, peak RSS 4,263 MB. Heap limit 4,345,298,944 bytes (Node.js v22.23.3 default on this machine).
- S4 full suite: CV 10.0% (TS 7), 5.7% (TS 6, 16 GB heap), 7.5% (TS 7 single-threaded). Above 5%.
- Investigation of the variance: load average rose from 3.61 to 4.94 during S4 (WebStorm, Next.js dev server, VM still open). The runs are interleaved, so the drift affected all three conditions; no single outlier run. Decision, per the variance rule: 5 more interleaved runs of the three full-suite conditions (series S5, with a discarded warm-up), then pool S4 and S5.
- Anomaly A1, explained: with parallel checking (TS 7 default), Types and Instantiations change from run to run (Types 15,320,708 / 15,320,762 / 15,320,717). With `--singleThreaded` they are identical across runs (Types 8,535,794). So TS 7's counters are not deterministic with several checkers, and are much higher than single-threaded on the same program: under parallel checking the counters are not a stable measure of work. Timings are not affected by this.
  > [Annotation, 2026-11-11T10:32Z] Superseded by the 09:40Z entry: single-threaded mode varies too, so this entry's implication that it is stable is wrong.
- The 2026-11-09 M3 Pro session (3 runs, no warm-up, not interleaved) is superseded by these protocol series for the M3 Pro. The file is kept in `results/`; `analyze.mjs` uses protocol sessions when a machine has any. Its TS 6 sources spread (1.98 to 3.26 s) is consistent with a cold first run: with a discarded warm-up the TS 6 spread is now 1.66 to 1.70 s.

## 2026-11-11T09:25Z, S5
`CONDITIONS=full-ts7,full-ts6-heap16g,full-ts7-single RUNS=5 SERIES=full-extra INTERLEAVE=1 WARMUP=1 COOLDOWN=120`

## 2026-11-11T09:40Z, S5 done, final pooling
- S5 (`SERIES=full-extra`, 5 runs + 1 discarded warm-up per condition, interleaved). AC power, Low Power Mode off, load average 3.49 before, 3.75 after.
- Pooled S4 + S5 (8 runs each): TS 7 full CV 6.7%, TS 6 16 GB heap 5.5%, TS 7 single-threaded 5.6%. Still above 5% after the extra runs: data kept, instability stated in the limits (token `full.cv.max`).
- Correction to anomaly A1 (entry of 09:23Z): with 8 runs, `--singleThreaded` also shows varying counters on the full suite (Types 8,535,794 and 8,535,872; Instantiations 34,156,859 and 34,156,989). So the variation is not caused by parallel checking alone. With parallel checking it is larger (6 distinct Types values in 8 runs). On the sources, every TS 7 condition has identical counters. The limits note, README and METHOD.md were corrected.
- Final numbers come from `node experiments/002-ts6-vs-ts7-type-fest/analyze.mjs`; the page text is generated from them by `tools/build-index.mjs`.

## 2026-11-11, follow-ups requested by Martin (not pushed)
- Takeaway rewritten: the old "more checkers help less" contradicted the data (`--checkers 8` 0.377 s vs default 0.484 s). New tokens `chk.c8.gain` (1 - median(c8) / median(default)) and `chk.load.min/max` (load average around the checker series). Limit note on the checker series rewritten: other applications open, and the comparison with the default mode crosses two series.
- Counter stability, all recorded runs on the M3 Pro (measured runs, discarded warm-ups and the 2026-11-09 session): every sources condition, every `--checkers N` condition and TS 6 on the full suite have identical counters across runs. TS 7 on the full suite does not: default mode Types 15,320,708 to 15,320,786 (8 distinct values in 13 runs), single-threaded 8,535,794 to 8,535,872 (2 distinct values in 10 runs). Largest relative spread below 0.001%. The counters also depend on the checker count (1 checker = single-threaded, 4 checkers = default mode, on this machine).
- Lab #001: `analyze.mjs` added; its verdict and notes are generated. `tools/stats.mjs` shared by both analyzers. `build-index.mjs` now fails, for every experiment, on a hand-written measured number (units, percent, times, runs, cores, checkers). Tested with a throwaway experiment ("About 40 percent faster." fails the build), then removed.
- `analyze.mjs` now pools, for each condition, only the series of the most recent day that measured it; the notebook page picks its headline from the newest session that has the needed conditions. Today's numbers are unchanged (checked).
- `quiet.mjs` (`npm run lab:002:quiet`) prepared, not run: checker series with the default mode in the same series (1, 2, 4, 8, 12 checkers, 7 runs), then the full suite (7 runs), AC required, waits for a low load average.
