// Collects every experiments/*/experiment.json and results/*.json into docs/data.json.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "experiments");
const experiments = readdirSync(dir)
  .filter((name) => existsSync(path.join(dir, name, "experiment.json")))
  .sort()
  .map((name) => {
    const meta = JSON.parse(readFileSync(path.join(dir, name, "experiment.json"), "utf8"));
    const resultsDir = path.join(dir, name, "results");
    const sessions = existsSync(resultsDir)
      ? readdirSync(resultsDir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(path.join(resultsDir, f), "utf8")))
      : [];
    return { folder: name, ...meta, sessions };
  });
writeFileSync(path.join(root, "docs/data.json"), JSON.stringify({ generatedAt: new Date().toISOString(), experiments }, null, 2));
console.log(`docs/data.json written with ${experiments.length} experiments`);
