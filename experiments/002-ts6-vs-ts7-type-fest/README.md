# Lab #002: TypeScript 6 vs 7 on type-fest

## Question
How much faster does TypeScript 7 type-check a real, type-heavy library than TypeScript 6, and how much of the gain comes from the native compiler itself rather than parallel checking? What happens to memory on a heavy workload?

## Target
[type-fest](https://github.com/sindresorhus/type-fest) at commit `2fbae25f05b697c0011d0e2f931d015a77a61ba8`.

## Conditions
- Library sources only (`index.d.ts` and `source/`): TypeScript 6.0.3, TypeScript 7.0.2, TypeScript 7.0.2 with `--singleThreaded`.
- TypeScript 7.0.2 with `--checkers 1`, `2`, `4` and `8` on the sources (separate series).
- Full suite including the type tests (`test-d/`): TypeScript 6.0.3 with Node.js's default heap (expected to fail, run once to record the error), TypeScript 6.0.3 with `NODE_OPTIONS=--max-old-space-size=16384`, TypeScript 7.0.2, TypeScript 7.0.2 with `--singleThreaded`.

## Run it
```bash
npm run lab:002                      # plain mode: every condition, 3 runs, in sequence
SKIP_FULL=1 npm run lab:002          # sources only, if your machine has little memory

# Protocol mode, as used for the published Apple M3 Pro results:
INTERLEAVE=1 WARMUP=1 RUNS=7 SERIES=sources CONDITIONS=src-ts6,src-ts7,src-ts7-single npm run lab:002
node experiments/002-ts6-vs-ts7-type-fest/analyze.mjs   # medians, IQR, CV, ranges and the native vs parallel split
```

## Re-measure on a quiet machine
Close every other application, plug the machine in, then run from the repository root:

```bash
npm run lab:002:quiet
```

One command, two series, then the analysis:
1. Checker series on the sources: TypeScript 7.0.2 default, then `--checkers 1`, `2`, `4`, `8` and `12`, 7 runs each. The default mode is in the same series, so each checker count is compared with it directly.
2. Full suite: TypeScript 6.0.3 with `NODE_OPTIONS=--max-old-space-size=16384`, TypeScript 7.0.2 default, TypeScript 7.0.2 with `--singleThreaded`, 7 runs each.

Each series uses one discarded warm-up per condition, interleaved conditions, 120 s of idle time first, and waits for AC power. Before starting, the script waits up to 15 minutes for the 1-minute load average to drop below 1.5, and stops with the busiest processes listed if it does not (`FORCE=1` to measure anyway). Options: `RUNS_CHECKERS`, `RUNS_FULL`, `LOAD_MAX`, `LOAD_WAIT_MIN`, `SKIP_FULL=1`. The log goes to `results/<date>-quiet.log`. `analyze.mjs` then uses, for each condition, the most recent day that measured it, so the quiet runs replace the earlier noisy ones instead of being mixed with them.

## Results and status
The verdict, every number in it and the limits are generated from `results/` by `analyze.mjs` and shown in the [lab notebook](https://martinferret.dev/typescript-performance-lab/experiments/002-ts6-vs-ts7-type-fest/). `tools/build-index.mjs` fails if a number in the text is not computed from the data.

Status: open until a second machine is measured with the same protocol. The Intel Xeon results were taken with the earlier protocol (3 runs, no warm-up, not interleaved).

Every command, anomaly and decision is in [NOTEBOOK.md](NOTEBOOK.md).

## Note
Types and Instantiations differ between TypeScript 6 and 7 on identical code, so these counters are never compared across compilers. TypeScript 7's counters also vary slightly from run to run on the full suite, single-threaded included; on the library sources they are identical.
