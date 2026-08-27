import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const cfg=JSON.parse(fs.readFileSync(path.join(root,'release-config.json'),'utf8'));
const configured = cfg.githubOwner && cfg.githubOwner !== 'SEU_USUARIO_GITHUB' && cfg.githubRepo;
const manifest = process.env.CHRONOCORD_UPDATE_MANIFEST_URL || (configured ? `https://raw.githubusercontent.com/${cfg.githubOwner}/${cfg.githubRepo}/main/${cfg.manifestPath || 'updates/latest.json'}` : 'https://example.invalid/chronocord/latest.json');
const releaseRepo = configured ? `${cfg.githubOwner}/${cfg.githubRepo}` : 'matheuz232/chronocord-server';
if (!configured) console.warn('Aviso: release-config.json ainda não está configurado. O instalador será gerado, mas o updater ficará inativo até a publicação do manifesto.');
const updater=path.join(root,'update-updater','main.cjs');
let s=fs.readFileSync(updater,'utf8').replace(/const MANIFEST_URL = '[^']*';/, `const MANIFEST_URL = '${manifest}';`)
  .replace(/const RELEASE_REPO = '[^']*';/, `const RELEASE_REPO = '${releaseRepo}';`);
fs.writeFileSync(updater,s);
const brandingDir = path.join(root, 'update-updater', 'branding');
fs.mkdirSync(brandingDir, { recursive: true });
fs.copyFileSync(path.join(root, 'assets', 'chronocord-logo.svg'), path.join(brandingDir, 'chronocord-logo.svg'));
fs.copyFileSync(path.join(root, 'assets', 'chronocord.ico'), path.join(brandingDir, 'chronocord.ico'));
const updaterNodeModules = path.join(root, 'update-updater', 'node_modules');
if (!fs.existsSync(updaterNodeModules)) {
  console.log('Instalando dependências do updater…');
  const install = spawnSync(process.platform==='win32'?'cmd.exe':'npm', process.platform==='win32'?['/c','npm','install','--prefix','update-updater','--include=optional']:['install','--prefix','update-updater','--include=optional'], {stdio:'inherit'});
  if (install.status !== 0) process.exit(install.status || 1);
}
const r=spawnSync(process.platform==='win32'?'cmd.exe':'npm',process.platform==='win32'?['/c','npm','run','dist:win','--prefix','update-updater']:['run','dist:win','--prefix','update-updater'],{stdio:'inherit'});
if(r.status!==0)process.exit(r.status||1);
const exe=path.join(root,'update-updater','release','ChronoCordUpdater.exe');
if(!fs.existsSync(exe)) throw new Error('ChronoCordUpdater.exe não foi gerado.');
fs.mkdirSync(path.join(root,'build','updater'),{recursive:true});
fs.copyFileSync(exe,path.join(root,'build','updater','ChronoCordUpdater.exe'));
console.log('Updater copiado para build/updater.');
