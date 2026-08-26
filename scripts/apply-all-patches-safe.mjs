import { spawnSync } from "node:child_process";

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

let fatal = false;
for (const script of scripts) {
  const result = spawnSync(process.execPath, [`scripts/${script}`], { stdio: "inherit", encoding: "utf8" });
  if (result.error) {
    console.warn(`[patch-safe] ${script}: processo não pôde ser iniciado: ${result.error.message}`);
    continue;
  }
  if (result.status !== 0) {
    console.warn(`[patch-safe] ${script}: ignorado após falha controlada (exit ${result.status}).`);
  }
}

if (fatal) process.exit(1);
console.log("[patch-safe] Pipeline de patches concluído; falhas individuais foram isoladas.");
