import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const scripts = [
  "apply-animation-pack.mjs",
  "apply-profile-media-fix.mjs",
  "apply-profile-layout-fix.mjs",
  "apply-profile-showcase.mjs",
  "apply-login-redesign.mjs",
  "apply-branding-login-v2.mjs",
  "apply-stability-patches.mjs",
  "apply-settings-page.mjs",
  "apply-sticker-studio.mjs",
  "apply-installer-branding.mjs",
];

const ignorablePatterns = [
  /Patch não encontrado/i,
  /anchor not found/i,
  /already applied/i,
  /already uses/i,
  /already generated/i,
  /already present/i,
  /não precisa ser aplicado/i,
];

let hardFailures = 0;
let ok = 0;
let skipped = 0;

for (const script of scripts) {
  const full = path.join(root, "scripts", script);
  const result = spawnSync(process.execPath, [full], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const exitCode = Number.isInteger(result.status) ? result.status : 1;

  if (exitCode === 0) {
    ok += 1;
    continue;
  }

  if (ignorablePatterns.some((pattern) => pattern.test(output))) {
    skipped += 1;
    const lastLine = output.split(/\r?\n/).filter(Boolean).at(-1) || "patch já aplicado ou não necessário; continuando.";
    console.warn(`[patch-safe] ${script}: ${lastLine}`);
    continue;
  }

  hardFailures += 1;
  console.error(`[patch-safe] ${script}: falha real.`);
  if (output) console.error(output);
}

console.log(`[patch-safe] ${ok} ok, ${skipped} ignorados, ${hardFailures} falhas reais.`);
if (hardFailures > 0) process.exit(1);
