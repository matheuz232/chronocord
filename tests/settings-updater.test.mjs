import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const updaterPkg = JSON.parse(readFileSync(resolve(root, 'update-updater', 'package.json'), 'utf8'));

test('updater is packaged as a portable helper and never auto-publishes from CI', () => {
  assert.equal(updaterPkg.build?.win?.target, 'portable');
  assert.match(updaterPkg.scripts?.['dist:win'] || '', /--win\s+portable\b/);
  assert.match(updaterPkg.scripts?.['dist:win'] || '', /--publish\s+never\b/);
  assert.doesNotMatch(updaterPkg.scripts?.['dist:win'] || '', /--win\s+nsis\b/);
});
