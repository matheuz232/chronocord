import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const updaterPkg = JSON.parse(readFileSync(resolve(root, 'update-updater', 'package.json'), 'utf8'));
const releaseConfig = JSON.parse(readFileSync(resolve(root, 'release-config.json'), 'utf8'));
const buildUpdaterSource = readFileSync(resolve(root, 'scripts-build.mjs'), 'utf8');
const updaterMainSource = readFileSync(resolve(root, 'update-updater', 'main.cjs'), 'utf8');
const electronMainSource = readFileSync(resolve(root, 'electron', 'main.cjs'), 'utf8');

test('updater is packaged as a portable helper and never auto-publishes from CI', () => {
  assert.equal(updaterPkg.build?.win?.target, 'portable');
  assert.match(updaterPkg.scripts?.['dist:win'] || '', /--win\s+portable\b/);
  assert.match(updaterPkg.scripts?.['dist:win'] || '', /--publish\s+never\b/);
  assert.doesNotMatch(updaterPkg.scripts?.['dist:win'] || '', /--win\s+nsis\b/);
});

test('updater separates the manifest repository from the application release repository', () => {
  assert.equal(releaseConfig.githubOwner, 'matheuz232');
  assert.equal(releaseConfig.githubRepo, 'chronocord-server');
  assert.equal(releaseConfig.releaseRepo, 'chronocord');
  assert.match(buildUpdaterSource, /cfg\.releaseRepo\s*\|\|\s*cfg\.githubRepo/);
});

test('updater stays invisible until a newer version is confirmed and then updates automatically', () => {
  assert.doesNotMatch(updaterMainSource, /ready-to-show[^\n]*win\.show\(\)/);
  assert.match(updaterMainSource, /await\s+win\.loadFile\(/);
  assert.match(updaterMainSource, /cmp\(m\.version,currentVersion\)<=0\)\{app\.quit\(\);return\}/);
  assert.match(updaterMainSource, /win\.show\(\);\s*await\s+performUpdate\(m\)/);
  assert.doesNotMatch(updaterMainSource, /send\('available'/);
});

test('desktop launches the updater from a temporary copy and supplies the installed app path', () => {
  assert.match(electronMainSource, /const\s+updaterCopy\s*=\s*path\.join\(app\.getPath\('temp'\)/);
  assert.match(electronMainSource, /fs\.copyFileSync\(helper,\s*updaterCopy\)/);
  assert.match(electronMainSource, /spawn\(updaterCopy,/);
  assert.match(electronMainSource, /`--app-exe=\$\{process\.execPath\}`/);
});

test('updater waits for a silent NSIS install and relaunches the installed ChronoCord executable', () => {
  assert.match(updaterMainSource, /const\s+appExe\s*=\s*String\(args\['app-exe'\]\s*\|\|\s*''\)/);
  assert.match(updaterMainSource, /const\s+installArgs\s*=\s*\['\/S'\]/);
  assert.match(updaterMainSource, /installArgs\.push\(`\/D=\$\{path\.dirname\(appExe\)\}`\)/);
  assert.match(updaterMainSource, /await\s+runProcess\(dest,\s*installArgs\)/);
  assert.match(updaterMainSource, /spawn\(appExe,\s*\[\],\s*\{\s*detached:\s*true,\s*stdio:\s*'ignore',\s*windowsHide:\s*false\s*\}\)/);
  assert.doesNotMatch(updaterMainSource, /spawn\(dest,\s*\['--updated'\]/);
});

test('checksum downloads follow bounded HTTPS redirects before validation', () => {
  assert.match(updaterMainSource, /function\s+requestText\(url,\s*redirects\s*=\s*0\)/);
  assert.match(updaterMainSource, /if\s*\(u\.protocol\s*!==\s*'https:'\)/);
  assert.match(updaterMainSource, /if\s*\(redirects\s*>\s*5\)/);
  assert.match(updaterMainSource, /requestText\(new URL\(res\.headers\.location,\s*u\)\.href,\s*redirects\s*\+\s*1\)/);
  assert.match(updaterMainSource, /const\s+checksumText\s*=\s*await\s+requestText\(sha\.browser_download_url\)/);
});
