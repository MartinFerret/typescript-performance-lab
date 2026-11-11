# Method

Every experiment in this lab follows the same protocol, so results can be compared and reproduced.

## 1. Pin everything
- The TypeScript versions are pinned in `package.json` (`typescript6` and `typescript7`).
- External projects are cloned at a pinned commit, recorded in `experiment.json`.
- The machine context (CPU, cores, RAM, OS, Node.js) is saved with every result.

## 2. Measure the same way, every time
- Each condition runs `tsc -p <project> --extendedDiagnostics`, three times by default (`RUNS=5` to change it).
- The median is reported, and the fastest and slowest runs are shown as a range.
- Stable counters (Files, Types, Instantiations) are recorded next to timings. They must be identical across runs of the same condition. Known exception: TypeScript 7 can report slightly different counters from run to run on large programs, with or without `--singleThreaded` (see Lab #002). Timings are not affected, but the counters are then not a proof that every run did the same work.

### Protocol mode (Lab #002 onward)
Set `INTERLEAVE=1` and `WARMUP=1` (see the experiment's `run.mjs`):
- one warm-up run per condition fills the file system cache and is discarded (kept in the results file as `warmupDiscarded`);
- conditions are interleaved (A B C A B C ...) so slow drifts such as heat or background tasks affect every condition equally;
- the machine idles 120 seconds before each series (`COOLDOWN`);
- every series records the power source, Low Power Mode and load average before and after it;
- a failed run stores its exit code, signal, peak memory and error lines.

### Statistics
- Median: middle value, mean of the two middle values for an even count.
- Spread: minimum and maximum, interquartile range (quartiles by linear interpolation), and coefficient of variation (sample standard deviation / mean).
- Variance rule: above 5% coefficient of variation, the cause is investigated and logged, then 5 more runs are added. If it stays above 5%, the data is kept and the instability is stated in the limits.
- Gains are ratios of medians. Their conservative range is min(A) / max(B) to max(A) / min(B).

### Memory
- Peak memory is peak resident memory (RSS) from `/usr/bin/time` (macOS: `-l`, "maximum resident set size"; Linux: `-v`), when it is available. It is the peak of the largest process, not the sum of the process tree.
- The compiler's own "Memory used" line is a different metric (for TypeScript 6, the V8 heap) and is always labeled separately.
- An out-of-memory failure names its cause: Node.js's heap limit (the error says "Reached heap limit") or an unrecorded cause.

## 3. Change one thing at a time
A fix changes a single thing, keeps the change minimal, and keeps the same type safety.

## 4. Prove type safety
When a fix changes types, a `safety.ts` file lists usages that must still fail to compile, using `// @ts-expect-error`. The experiment stops if the safety check fails.

## 5. Publish the verdict, whatever it is
A hypothesis can be confirmed, rejected, or stay open. Negative results are published too.

## 6. Know the limits
- Timings vary between machines. Compare conditions measured on the same machine.
- TypeScript 6 and TypeScript 7 may not count Types and Instantiations the same way. Do not compare these counters across compilers without checking how each one counts.
- Close other heavy applications while measuring.
