import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(pkg.version || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Versão inválida: ${version || '(vazia)'}`);

const projectDir = path.join(root, 'installer-bootstrapper');
const payloadDir = path.join(projectDir, 'payload');
const assetsDir = path.join(projectDir, 'assets');
const sourceSetup = path.join(root, 'release', `ChronoCord-Setup-${version}.exe`);
const targetSetup = path.join(payloadDir, `ChronoCord-Setup-${version}.exe`);
const sourceIcon = path.join(root, 'assets', 'chronocord.ico');
const targetIcon = path.join(assetsDir, 'chronocord.ico');
const sourceLogo = path.join(root, 'assets', 'chronocord-logo-transparent.svg');
const targetLogo = path.join(assetsDir, 'chronocord-logo.svg');

for (const file of [sourceSetup, sourceIcon, sourceLogo]) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${path.relative(root, file)}`);
}

fs.mkdirSync(payloadDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });
fs.copyFileSync(sourceSetup, targetSetup);
fs.copyFileSync(sourceIcon, targetIcon);
fs.copyFileSync(sourceLogo, targetLogo);

const bootstrapperPkgPath = path.join(projectDir, 'package.json');
const bootstrapperPkg = JSON.parse(fs.readFileSync(bootstrapperPkgPath, 'utf8'));
bootstrapperPkg.version = version;
bootstrapperPkg.build.extraResources = bootstrapperPkg.build.extraResources.map((entry) => {
  if (String(entry.from || '').startsWith('payload/ChronoCord-Setup-')) return { ...entry, from: `payload/ChronoCord-Setup-${version}.exe`, to: `ChronoCord-Setup-${version}.exe` };
  return entry;
});
fs.writeFileSync(bootstrapperPkgPath, `${JSON.stringify(bootstrapperPkg, null, 2)}\n`);

const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const args = process.platform === 'win32'
  ? ['/c', 'npx', 'electron-builder', '--projectDir', 'installer-bootstrapper', '--win', 'portable', '--x64', '--publish', 'never']
  : ['electron-builder', '--projectDir', 'installer-bootstrapper', '--win', 'portable', '--x64', '--publish', 'never'];
const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);

const built = path.join(projectDir, 'release', `ChronoCord-Installer-${version}.exe`);
if (!fs.existsSync(built)) throw new Error('O bootstrapper animado não foi gerado.');
const finalTarget = path.join(root, 'release', path.basename(built));
fs.copyFileSync(built, finalTarget);
console.log(`Bootstrapper copiado para ${path.relative(root, finalTarget)}.`);
