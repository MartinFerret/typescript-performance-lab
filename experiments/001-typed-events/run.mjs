import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bench, compilers, environment } from "../../tools/bench.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runs = Number(process.env.RUNS ?? 3);

console.log("Safety check: the fixed version must still reject wrong usages");
const safety = spawnSync(process.execPath, [compilers.ts7.bin, "-p", "tsconfig.safety.json"], { cwd: here, encoding: "utf8" });
if (safety.status !== 0) {
  console.error(safety.stdout, safety.stderr);
  throw new Error("Safety check failed: the fix lost type safety.");
}
console.log("  ok\n");

const conditions = [];
for (const compiler of ["ts6", "ts7"]) {
  for (const version of ["before", "after"]) {
    conditions.push({
      key: `${version}-${compiler}`,
      ...bench({ compiler, project: "tsconfig.json", cwd: path.join(here, version), runs, label: `${version} (${compilers[compiler].label})`, scope: version }),
    });
  }
}

const session = { date: new Date().toISOString(), environment: environment(), runsPerCondition: runs, safetyCheck: "passed", conditions };
mkdirSync(path.join(here, "results"), { recursive: true });
const file = path.join(here, "results", `${session.date.slice(0, 10)}-${process.platform}-${session.environment.cores}cores.json`);
writeFileSync(file, JSON.stringify(session, null, 2));
console.log(`\nSaved ${path.relative(process.cwd(), file)}`);
