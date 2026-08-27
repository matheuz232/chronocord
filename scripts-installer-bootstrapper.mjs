import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(pkg.version || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Versão inválida: ${version || '(vazia)'}`);
if (process.platform !== 'win32') throw new Error('O instalador nativo do ChronoCord deve ser compilado no Windows.');

const sourceSetup = path.join(root, 'release', `ChronoCord-Setup-${version}.exe`);
const sourceBlockmap = `${sourceSetup}.blockmap`;
const nativeSourcePath = path.join(root, 'installer-bootstrapper', 'Program.cs');
const icon = path.join(root, 'assets', 'chronocord.ico');
for (const file of [sourceSetup, nativeSourcePath, icon]) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${path.relative(root, file)}`);
}

const generatedDir = path.join(root, 'build', 'generated');
const nativeBuildDir = path.join(root, 'build', 'installer');
fs.mkdirSync(generatedDir, { recursive: true });
fs.mkdirSync(nativeBuildDir, { recursive: true });
const generatedSource = path.join(generatedDir, 'ChronoCordInstaller.generated.cs');
const baseExe = path.join(nativeBuildDir, 'ChronoCord-Installer-base.exe');
const finalTarget = path.join(root, 'release', `ChronoCord-Installer-${version}.exe`);

const source = fs.readFileSync(nativeSourcePath, 'utf8').replaceAll('__VERSION__', version);
fs.writeFileSync(generatedSource, source);

const windowsDir = process.env.WINDIR || 'C:\\Windows';
const csc = path.join(windowsDir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
if (!fs.existsSync(csc)) throw new Error(`Compilador .NET Framework não encontrado: ${csc}`);

const compileArgs = [
  '/nologo',
  '/target:winexe',
  '/optimize+',
  '/platform:x64',
  `/out:${baseExe}`,
  `/win32icon:${icon}`,
  '/reference:System.dll',
  '/reference:System.Core.dll',
  '/reference:System.Drawing.dll',
  '/reference:System.Windows.Forms.dll',
  generatedSource,
];
const compile = spawnSync(csc, compileArgs, { cwd: root, stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status || 1);
if (!fs.existsSync(baseExe) || fs.statSync(baseExe).size < 16 * 1024) throw new Error('Launcher nativo não foi compilado corretamente.');

const payload = fs.readFileSync(sourceSetup);
const hash = createHash('sha256').update(payload).digest();
const payloadLength = Buffer.alloc(8);
payloadLength.writeBigUInt64LE(BigInt(payload.length));
const trailer = Buffer.concat([
  Buffer.from('CCP10301', 'ascii'),
  payloadLength,
  hash,
]);
if (trailer.length !== 48) throw new Error(`Trailer interno inválido: ${trailer.length} bytes.`);

fs.copyFileSync(baseExe, finalTarget);
fs.appendFileSync(finalTarget, payload);
fs.appendFileSync(finalTarget, trailer);

const finalSize = fs.statSync(finalTarget).size;
if (finalSize <= payload.length) throw new Error('O instalador final não contém o launcher e o payload esperados.');
console.log(`Instalador único gerado: ${path.relative(root, finalTarget)} (${finalSize} bytes).`);
console.log(`Payload NSIS: ${payload.length} bytes; launcher+trailer: ${finalSize - payload.length} bytes.`);

// The NSIS setup is an internal build payload only. Removing it here makes it
// impossible for the artifact/release step to accidentally publish a second installer.
fs.rmSync(sourceSetup, { force: true });
fs.rmSync(sourceBlockmap, { force: true });
console.log('Setup NSIS interno removido da pasta release após ser incorporado ao instalador final.');
