# Lab #002: TypeScript 6 vs 7 on type-fest

## Question
How much faster does TypeScript 7 type-check a real, type-heavy library, and how much of the gain comes from parallel checking rather than the native compiler itself?

## Target
[type-fest](https://github.com/sindresorhus/type-fest) at commit `2fbae25f05b697c0011d0e2f931d015a77a61ba8`.

## Conditions
- Library sources only (`index.d.ts` and `source/`), with TypeScript 6.0.3, TypeScript 7.0.2, and TypeScript 7.0.2 with `--singleThreaded`.
- Full suite including the type tests (`test-d/`), with both compilers.

## Run it
```bash
npm run lab:002
SKIP_FULL=1 npm run lab:002   # sources only, if your machine has little memory
```

## Status: open
In the reference environment (1 core, 4 GB RAM), TypeScript 7 checked the sources about 3 times faster with lower memory, and the full suite ran out of memory with both compilers. With a single core, single-threaded mode makes almost no difference, so results on multi-core machines are needed to separate the native compiler gain from the parallelism gain.

## Note
Types and Instantiations differ between TypeScript 6 and 7 on identical code. The two compilers may not count the same way, so these counters are not compared across compilers.
