import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const releaseConfig = JSON.parse(readFileSync(resolve(root, 'release-config.json'), 'utf8'));
const buildUpdaterSource = readFileSync(resolve(root, 'scripts-build.mjs'), 'utf8');
const electronMainSource = readFileSync(resolve(root, 'electron', 'main.cjs'), 'utf8');
const nativePath = resolve(root, 'update-updater', 'Program.cs');
const updaterSource = existsSync(nativePath) ? readFileSync(nativePath, 'utf8') : '';

test('updater is a native Windows helper instead of a second Electron runtime', () => {
  assert.ok(updaterSource, 'native updater source update-updater/Program.cs is missing');
  assert.match(buildUpdaterSource, /Framework64/);
  assert.match(buildUpdaterSource, /csc\.exe/);
  assert.match(buildUpdaterSource, /ChronoCordUpdater\.exe/);
  assert.doesNotMatch(buildUpdaterSource, /npm[^\n]+--prefix[^\n]+update-updater/);
  assert.doesNotMatch(buildUpdaterSource, /electron-builder[^\n]+update-updater/);
  assert.doesNotMatch(updaterSource, /Electron|BrowserWindow|ipcMain|ipcRenderer/);
});

test('updater keeps manifest and release repository configuration separated', () => {
  assert.equal(releaseConfig.githubOwner, 'matheuz232');
  assert.equal(releaseConfig.githubRepo, 'chronocord-server');
  assert.equal(releaseConfig.releaseRepo, 'chronocord');
  assert.match(buildUpdaterSource, /cfg\.releaseRepo\s*\|\|\s*cfg\.githubRepo/);
  assert.match(updaterSource, /__MANIFEST_URL__/);
  assert.match(updaterSource, /__RELEASE_REPO__/);
});

test('desktop launches the updater from a temporary copy and supplies the installed app path', () => {
  assert.match(electronMainSource, /const\s+updaterCopy\s*=\s*path\.join\(app\.getPath\('temp'\)/);
  assert.match(electronMainSource, /fs\.copyFileSync\(helper,\s*updaterCopy\)/);
  assert.match(electronMainSource, /spawn\(updaterCopy,/);
  assert.match(electronMainSource, /`--app-exe=\$\{process\.execPath\}`/);
});

test('native updater only follows bounded HTTPS redirects', () => {
  assert.match(updaterSource, /const\s+int\s+MaxRedirects\s*=\s*5/);
  assert.match(updaterSource, /Uri\.UriSchemeHttps/);
  assert.match(updaterSource, /AllowAutoRedirect\s*=\s*false/);
  assert.match(updaterSource, /redirects\s*>\s*MaxRedirects/);
});

test('native updater verifies SHA-256 before running the downloaded installer', () => {
  assert.match(updaterSource, /SHA256\.Create\(\)/);
  assert.match(updaterSource, /ChronoCord-Installer-/);
  assert.match(updaterSource, /\.sha256/);
  assert.match(updaterSource, /--silent/);
  assert.match(updaterSource, /--dir=/);
  assert.match(updaterSource, /checksum/i);
});

test('native updater bounds the old-process wait and relaunches installed ChronoCord', () => {
  assert.match(updaterSource, /ExitWaitMilliseconds\s*=\s*20000/);
  assert.match(updaterSource, /WaitForExit\(ExitWaitMilliseconds\)/);
  assert.match(updaterSource, /Process\.Start/);
  assert.match(updaterSource, /appExe/);
});

test('native updater has an offline smoke-test path', () => {
  assert.match(updaterSource, /ContainsKey\("smoke-test"\)/);
  assert.match(updaterSource, /SmokeTest\(\)/);
});
