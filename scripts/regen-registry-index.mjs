// Regenerate open-sse/providers/registry/index.js (alphabetical static import list)
import { readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url)) + "/../open-sse/providers/registry";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".js") && f !== "index.js" && f !== "REGISTRY_TEMPLATE.js")
  .sort();

let out = "// Auto-generated: static imports for all registry entries\n";
files.forEach((f, i) => {
  out += `import p${i} from "./${f}";\n`;
});
out += "\nconst REGISTRY = [\n";
files.forEach((f, i) => {
  out += `  p${i},\n`;
});
out += "];\n\nexport default REGISTRY;\n";
writeFileSync(join(dir, "index.js"), out);
console.log(`regenerated index.js with ${files.length} entries`);
