import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'build', 'chronocord-product-transform.mjs'), 'utf8');

test('product transform keeps the packaged app version synchronized at 1.0.4', () => {
  assert.match(source, /const appVersionMarker = 'const APP_VERSION = "1\.0\.2";'/);
  assert.match(source, /output\.replace\(appVersionMarker, 'const APP_VERSION = "1\.0\.4";'\)/);
});

test('product transform replaces the existing Modal display value instead of adding a duplicate key', () => {
  assert.match(source, /const modalDisplayMarker = 'background: "#000000aa", display: "flex", alignItems:'/);
  assert.match(source, /display: hidden \? "none" : "flex"/);
  assert.doesNotMatch(source, /zIndex: 60, display: hidden \? "none" : "flex"/);
});
