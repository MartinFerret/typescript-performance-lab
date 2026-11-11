# Method

Every experiment in this lab follows the same protocol, so results can be compared and reproduced.

## 1. Pin everything
- The TypeScript versions are pinned in `package.json` (`typescript6` and `typescript7`).
- External projects are cloned at a pinned commit, recorded in `experiment.json`.
- The machine context (CPU, cores, RAM, OS, Node.js) is saved with every result.

## 2. Measure the same way, every time
- Each condition runs `tsc -p <project> --extendedDiagnostics` three times (`RUNS=5` to change it).
- The median is reported, and the fastest and slowest runs are shown as a range.
- Stable counters (Files, Types, Instantiations) are recorded next to timings. They must be identical across runs of the same condition.
- Peak memory is read from `/usr/bin/time` when it is available (macOS and most Linux systems).

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
