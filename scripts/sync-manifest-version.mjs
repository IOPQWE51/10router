#!/usr/bin/env node
// Sync fnos-packaging/manifest version from root package.json.
// Run automatically before packaging (prebuild:fpk) so the fpk version
// never drifts from the npm package version.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const manifestPath = join(root, "fnos-packaging", "manifest");

const manifest = readFileSync(manifestPath, "utf8");
const re = /^(version\s*=\s*)(.+)$/m;

if (!re.test(manifest)) {
  console.error("manifest: no `version =` line found, nothing to sync");
  process.exit(1);
}

const current = manifest.match(re)[2].trim();
const target = pkg.version;

if (current === target) {
  console.log(`manifest version already ${target}, nothing to do`);
} else {
  writeFileSync(manifestPath, manifest.replace(re, `$1${target}`));
  console.log(`manifest version: ${current} -> ${target}`);
}
