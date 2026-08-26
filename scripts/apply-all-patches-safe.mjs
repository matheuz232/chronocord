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
];

let hardFailures = 0;
const results = [];

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
    results.push({ script, status: "ok" });
    continue;
  }

  const ignorable = ignorablePatterns.some((pattern) => pattern.test(output));
  if (ignorable) {
    console.warn(`[patch-safe] ${script}: ${output.split(/\r?\n/).filter(Boolean).at(-1) || "patch já aplicado ou âncora ausente; continuando."}`);
    results.push({ script, status: "skipped", reason: "non-fatal patch mismatch" });
    continue;
  }

  hardFailures += 1;
  console.error(`[patch-safe] ${script} falhou com erro não recuperável.`);
  if (output) console.error(output);
  results.push({ script, status: "failed" });
}

console.log(`Patch pipeline concluído: ${results.filter((r) => r.status === "ok").length} ok, ${results.filter((r) => r.status === "skipped").length} ignorados, ${hardFailures} falhas reais.`);

if (hardFailures > 0) {
  process.exit(1);
}
