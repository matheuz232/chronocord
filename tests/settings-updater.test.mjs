import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const updaterPkg = JSON.parse(readFileSync(resolve(root, 'update-updater', 'package.json'), 'utf8'));
const releaseConfig = JSON.parse(readFileSync(resolve(root, 'release-config.json'), 'utf8'));
const buildUpdaterSource = readFileSync(resolve(root, 'scripts-build.mjs'), 'utf8');

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
