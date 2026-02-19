// scripts/copy-generated.mjs
import fs from "node:fs";
import path from "node:path";

const src = path.resolve("src", "generated");
const dest = path.resolve("dist", "src", "generated");

if (!fs.existsSync(src)) {
  console.error(`[copy-generated] Source not found: ${src}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });

// Node 16+ supports fs.cpSync
fs.cpSync(src, dest, { recursive: true });

console.log(`[copy-generated] Copied ${src} -> ${dest}`);
