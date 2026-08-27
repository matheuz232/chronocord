import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nativePath = resolve(root, 'installer-bootstrapper', 'Program.cs');
const installerSource = existsSync(nativePath) ? readFileSync(nativePath, 'utf8') : '';
const buildSource = readFileSync(resolve(root, 'scripts-installer-bootstrapper.mjs'), 'utf8');

test('animated installer is native and carries a verified appended payload', () => {
  assert.ok(installerSource, 'native installer source installer-bootstrapper/Program.cs is missing');
  assert.match(installerSource, /CCP10301/);
  assert.match(installerSource, /SHA256\.Create\(\)/);
  assert.match(buildSource, /Buffer\.from\('CCP10301',\s*'ascii'\)/);
  assert.match(buildSource, /writeBigUInt64LE/);
  assert.match(buildSource, /createHash\('sha256'\)/);
});

test('native installer preserves animated UI and folder selection without Electron', () => {
  assert.match(installerSource, /System\.Windows\.Forms/);
  assert.match(installerSource, /FolderBrowserDialog/);
  assert.match(installerSource, /System\.Windows\.Forms\.Timer|new Timer\(/);
  assert.match(installerSource, /ProgressBar|OnPaint|LinearGradientBrush/);
  assert.doesNotMatch(installerSource, /Electron|BrowserWindow|ipcMain|ipcRenderer/);
});

test('native installer supports smoke test and silent installation', () => {
  assert.match(installerSource, /raw\.StartsWith\("--"/);
  assert.match(installerSource, /ContainsKey\("smoke-test"\)/);
  assert.match(installerSource, /ContainsKey\("silent"\)/);
  assert.match(installerSource, /GetOption\(options,\s*"dir"/);
  assert.match(installerSource, /"\/S \/D="/);
});

test('native installer build uses Framework csc and never packages another Electron runtime', () => {
  assert.match(buildSource, /Framework64/);
  assert.match(buildSource, /csc\.exe/);
  assert.match(buildSource, /win32icon/);
  assert.doesNotMatch(buildSource, /electron-builder[^\n]+installer-bootstrapper/);
});

test('internal Setup is deleted after it is appended to the final installer', () => {
  assert.match(buildSource, /ChronoCord-Setup-/);
  assert.match(buildSource, /rmSync\(sourceSetup/);
  assert.match(buildSource, /blockmap/);
});
