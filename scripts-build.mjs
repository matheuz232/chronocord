import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'release-config.json'), 'utf8'));
const configured = cfg.githubOwner && cfg.githubOwner !== 'SEU_USUARIO_GITHUB' && cfg.githubRepo;
const manifest = process.env.CHRONOCORD_UPDATE_MANIFEST_URL || (configured
  ? `https://raw.githubusercontent.com/${cfg.githubOwner}/${cfg.githubRepo}/main/${cfg.manifestPath || 'updates/latest.json'}`
  : 'https://example.invalid/chronocord/latest.json');
const releaseRepoName = cfg.releaseRepo || cfg.githubRepo;
const releaseRepo = configured ? `${cfg.githubOwner}/${releaseRepoName}` : 'matheuz232/chronocord';

if (!configured) {
  console.warn('Aviso: release-config.json ainda não está configurado. O updater usará somente a configuração de fallback disponível.');
}
if (process.platform !== 'win32') throw new Error('O helper nativo do updater deve ser compilado no Windows.');

function csharpString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const sourcePath = path.join(root, 'update-updater', 'Program.cs');
if (!fs.existsSync(sourcePath)) throw new Error('update-updater/Program.cs não existe.');
let source = fs.readFileSync(sourcePath, 'utf8');
source = source
  .replaceAll('__MANIFEST_URL__', csharpString(manifest))
  .replaceAll('__RELEASE_REPO__', csharpString(releaseRepo))
  .replaceAll('Timer timer = new Timer();', 'System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();');

const generatedDir = path.join(root, 'build', 'generated');
const outputDir = path.join(root, 'build', 'updater');
fs.mkdirSync(generatedDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });
const generatedSource = path.join(generatedDir, 'ChronoCordUpdater.generated.cs');
const outputExe = path.join(outputDir, 'ChronoCordUpdater.exe');
fs.writeFileSync(generatedSource, source);

const windowsDir = process.env.WINDIR || 'C:\\Windows';
const csc = path.join(windowsDir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
if (!fs.existsSync(csc)) throw new Error(`Compilador .NET Framework não encontrado: ${csc}`);

const icon = path.join(root, 'assets', 'chronocord.ico');
const args = [
  '/nologo',
  '/target:winexe',
  '/optimize+',
  '/platform:x64',
  `/out:${outputExe}`,
  `/win32icon:${icon}`,
  '/reference:System.dll',
  '/reference:System.Core.dll',
  '/reference:System.Drawing.dll',
  '/reference:System.Windows.Forms.dll',
  '/reference:System.Web.Extensions.dll',
  generatedSource,
];
const result = spawnSync(csc, args, { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
if (!fs.existsSync(outputExe) || fs.statSync(outputExe).size < 16 * 1024) {
  throw new Error('ChronoCordUpdater.exe não foi gerado corretamente.');
}
console.log(`Updater nativo gerado: ${path.relative(root, outputExe)} (${fs.statSync(outputExe).size} bytes).`);
