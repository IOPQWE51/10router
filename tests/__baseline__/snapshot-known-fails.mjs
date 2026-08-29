// Rewrite known-fails.txt from a vitest JSON report, so the regression gate can
// be re-baselined without hand-editing the list.
//
// Usage: node tests/__baseline__/snapshot-known-fails.mjs <results.json>
//
// Only do this deliberately — every failure in the report becomes "expected",
// so re-baselining on a run that contains a genuine regression bakes that
// regression in. Run verify-no-regression.mjs first and read what it reports.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const resultsPath = process.argv[2];
if (!resultsPath) {
  console.error("Usage: node tests/__baseline__/snapshot-known-fails.mjs <results.json>");
  process.exit(2);
}

// Keys are `tests/`-relative — same derivation as verify-no-regression.mjs.
function toKey(absPath) {
  const p = absPath.replace(/\\/g, "/");
  const i = p.lastIndexOf("/tests/");
  return i < 0 ? p : p.slice(i + 1);
}

const report = JSON.parse(readFileSync(resultsPath, "utf8"));
const fails = report.testResults.flatMap((f) =>
  f.assertionResults
    .filter((a) => a.status === "failed")
    .map((a) => `${toKey(f.name)} :: ${a.fullName}`)
);

const sorted = [...new Set(fails)].sort();
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "known-fails.txt");
writeFileSync(out, sorted.length ? `${sorted.join("\n")}\n` : "");
console.log(`Wrote ${sorted.length} known failures → ${out}`);
