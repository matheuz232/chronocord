import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedElectron = "44.0.0";
const file = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
const electron = pkg.devDependencies?.electron;
if (!electron || /[~^*<>=|]/.test(electron)) {
  throw new Error(`Electron must be pinned to an exact version in package.json. Found: ${electron ?? "missing"}`);
}
if (electron !== expectedElectron) {
  throw new Error(`Unsupported Electron version: ${electron}. Expected ${expectedElectron}.`);
}
if (pkg.build?.electronVersion !== expectedElectron) {
  throw new Error(`build.electronVersion must match devDependencies.electron (${expectedElectron}). Found: ${pkg.build?.electronVersion ?? "missing"}`);
}
console.log(`Preflight OK: Electron is pinned to ${expectedElectron}.`);
console.log(`Node.js detected: ${process.versions.node}`);
