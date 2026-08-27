import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

function asset(path) {
  return resolve(root, path.replaceAll('/', process.platform === 'win32' ? '\\' : '/'));
}

test('Windows packaging uses the prebuilt ICO that is proven by the updater build', () => {
  assert.equal(pkg.build?.win?.icon, 'assets/chronocord.ico');
  assert.ok(existsSync(asset(pkg.build.win.icon)), `missing Windows icon: ${pkg.build.win.icon}`);
});

test('all explicit NSIS branding assets exist', () => {
  for (const key of ['installerIcon', 'uninstallerIcon', 'installerHeaderIcon', 'installerSidebar', 'installerHeader']) {
    const value = pkg.build?.nsis?.[key];
    assert.equal(typeof value, 'string', `missing nsis.${key}`);
    assert.ok(existsSync(asset(value)), `missing nsis.${key}: ${value}`);
  }
});
