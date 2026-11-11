# TypeScript Performance Lab

Measured, reproducible experiments on how fast TypeScript checks your types.

Every experiment comes with its code, the exact command that produced the numbers, and the raw results, so you can run it on your own machine.

## Experiments

| Lab | Question | Status |
|---|---|---|
| [#001](experiments/001-typed-events) | Does a mapped type with an `as` clause slow down every call site? | Confirmed |
| [#002](experiments/002-ts6-vs-ts7-type-fest) | How much faster is TypeScript 7 on type-fest, and where does the gain come from? | Open |

## Run the lab

Requirements: Node.js 22 or later, git.

```bash
npm install
npm run lab:001     # typed events, TypeScript 6 and 7
npm run lab:002     # type-fest, TypeScript 6 vs 7 (clones the library)
npm run site        # open the lab notebook on http://localhost:4173/typescript-performance-lab/
```

Each run saves a JSON file in `experiments/<lab>/results/`, named after the date, the OS and the number of cores.

## Add your machine

Results depend on the machine. Run an experiment, then open a pull request with the results file it created. The notebook shows every machine side by side.

## Method

See [METHOD.md](METHOD.md).

## Author

Run by [Martin Ferret](https://linkedin.com/in/martin-ferret), Lead Content Owner for the JavaScript and TypeScript certifications at Certificates.dev.
