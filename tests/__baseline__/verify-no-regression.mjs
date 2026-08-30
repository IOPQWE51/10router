// Gate: so kết quả test hiện tại với baseline known-fails.
// PASS nếu KHÔNG có test nào pass(baseline) → fail(now). Test mới được phép.
// Usage: node tests/__baseline__/verify-no-regression.mjs <current-results.json>
import { readFileSync } from "fs";

const knownFails = new Set(
  readFileSync(new URL("./known-fails.txt", import.meta.url), "utf8")
    .split("\n").map(s => s.trim()).filter(Boolean)
);

const resultsPath = process.argv[2];
if (!resultsPath) { console.error("Missing results.json path"); process.exit(2); }

// Keys in known-fails.txt start at `tests/`. Derive that from the absolute path
// vitest reports, rather than assuming the checkout sits under a directory named
// `app/` — it doesn't here, and splitting on "/app/" yielded undefined, so every
// failure looked like a regression and the gate could never pass.
function toKey(absPath) {
  const p = absPath.replace(/\\/g, "/");
  const i = p.lastIndexOf("/tests/");
  return i < 0 ? p : p.slice(i + 1);
}

const r = JSON.parse(readFileSync(resultsPath, "utf8"));
const nowFails = r.testResults.flatMap(f =>
  f.assertionResults.filter(a => a.status === "failed")
    .map(a => toKey(f.name) + " :: " + a.fullName)
);

// Regression = fail bây giờ NHƯNG không có trong baseline known-fails
const regressions = nowFails.filter(f => !knownFails.has(f));

if (regressions.length) {
  console.error(`\n❌ REGRESSION: ${regressions.length} test pass→fail:\n`);
  regressions.forEach(f => console.error("  - " + f));
  process.exit(1);
}
console.log(`✅ No regression. (now fails=${nowFails.length}, baseline known=${knownFails.size}, all known)`);
