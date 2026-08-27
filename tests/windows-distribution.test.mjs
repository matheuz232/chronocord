import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(resolve(root, '.github', 'workflows', 'windows-build.yml'), 'utf8');
const buildUpdater = readFileSync(resolve(root, 'scripts-build.mjs'), 'utf8');
const buildInstaller = readFileSync(resolve(root, 'scripts-installer-bootstrapper.mjs'), 'utf8');

function section(startMarker, endMarker) {
  const start = workflow.indexOf(startMarker);
  assert.ok(start >= 0, `missing workflow section start: ${startMarker}`);
  const end = workflow.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing workflow section end: ${endMarker}`);
  return workflow.slice(start, end);
}

test('Windows CI blocks vulnerable dependency graphs', () => {
  assert.match(workflow, /- name: Dependency security audit[\s\S]*?npm audit --audit-level=low/);
  assert.doesNotMatch(workflow, /Dependency security audit[\s\S]{0,250}continue-on-error:\s*true/);
});

test('Windows delivery exposes exactly one primary installer', () => {
  const upload = section('- name: Upload Windows installer', '- name: Publish GitHub Release');
  assert.match(upload, /release\/ChronoCord-Installer-\*\.exe/);
  assert.match(upload, /release\/ChronoCord-Installer-\*\.exe\.sha256/);
  assert.doesNotMatch(upload, /ChronoCord-Setup-/);

  const release = workflow.slice(workflow.indexOf('- name: Publish GitHub Release'));
  assert.match(release, /release\/ChronoCord-Installer-\*\.exe/);
  assert.match(release, /release\/ChronoCord-Installer-\*\.exe\.sha256/);
  assert.doesNotMatch(release, /ChronoCord-Setup-/);
});

test('Windows CI enforces the hard 285 MB final installer limit and prevents Setup leakage', () => {
  assert.match(workflow, /285000000/);
  assert.match(workflow, /ChronoCord-Setup-\$version\.exe/);
  assert.match(workflow, /Internal Setup leaked|Setup interno vazou|Setup leaked/i);
});

test('updater build uses the Windows native compiler instead of a nested Electron build', () => {
  assert.match(buildUpdater, /Framework64/);
  assert.match(buildUpdater, /csc\.exe/);
  assert.doesNotMatch(buildUpdater, /npm[^\n]+--prefix[^\n]+update-updater/);
  assert.doesNotMatch(buildUpdater, /electron-builder[^\n]+update-updater/);
});

test('animated installer build uses the Windows native compiler instead of another Electron runtime', () => {
  assert.match(buildInstaller, /Framework64/);
  assert.match(buildInstaller, /csc\.exe/);
  assert.doesNotMatch(buildInstaller, /electron-builder[^\n]+installer-bootstrapper/);
});
