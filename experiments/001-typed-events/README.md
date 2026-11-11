# Lab #001: Typed events

## Question
Does a mapped type with an `as` clause, indexed at every call site, make type-checking measurably slower than inferring the event name from a generic parameter?

## Setup
- `before/`: event names come from a mapped type with an `as` clause (`events.ts`), and the tsconfig has no `include`, so a generated file the app never imports is checked too.
- `after/`: the event name is built from the generic parameter, and `include` is narrowed to `src`.
- `safety.ts`: wrong usages that must still fail to compile with the fixed version.
- 1,700+ settings, 200 typed listeners.

## Run it
```bash
npm run lab:001
```

## What we found
Inferring the event name from the generic parameter cut check time by about 40% with TypeScript 6 and by about 65% with TypeScript 7, with the same type safety. See `results/` for the raw numbers and the machine they were measured on.

## Takeaway
A mapped type with an `as` clause is evaluated backwards at each indexed call site. If you can infer the key from a generic instead, the checker does far less work.
