import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [path.join(root, "package.json"), path.join(root, "update-updater", "package.json")];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  const electron = pkg.devDependencies?.electron;
  if (!electron || /[~^*<>=|]/.test(electron)) {
    throw new Error(`Electron must be pinned to an exact version in ${path.relative(root, file)}. Found: ${electron ?? "missing"}`);
  }
  if (electron !== "38.0.0") {
    throw new Error(`Unsupported Electron version in ${path.relative(root, file)}: ${electron}. Expected 38.0.0.`);
  }
}
console.log("Preflight OK: Electron is pinned to 38.0.0.");
console.log(`Node.js detected: ${process.versions.node}`);
