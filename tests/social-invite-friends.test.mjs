import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chronocordFeatureInteractions } from '../build/chronocord-feature-transform.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/ChronoCord.jsx'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'electron/preload.cjs'), 'utf8');
const mainProcess = [
  fs.readFileSync(path.join(root, 'electron/bootstrap.cjs'), 'utf8'),
  fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8'),
].join('\n');
const transformed = chronocordFeatureInteractions().transform(source, path.join(root, 'src/ChronoCord.jsx'))?.code || source;

test('server invite uses the real invite code and a selectable link', () => {
  assert.match(transformed, /inviteCode/);
  assert.match(transformed, /https:\/\/chronocord\.gg\/invite\//);
  assert.doesNotMatch(transformed, /chronocord\.gg\/\$\{activeEra\}-/);
  assert.match(transformed, /readOnly/);
  assert.match(transformed, /\.select\(\)/);
});

test('copy invite uses the Electron clipboard bridge and reports success only after completion', () => {
  assert.match(preload, /writeClipboardText:\s*\(text\)\s*=>\s*ipcRenderer\.invoke\('clipboard:write-text',\s*text\)/);
  assert.match(mainProcess, /clipboard/);
  assert.match(mainProcess, /ipcMain\.handle\('clipboard:write-text'/);
  assert.match(transformed, /await\s+window\.electronAPI\.writeClipboardText\(link\)/);
  assert.match(transformed, /await\s+navigator\.clipboard\.writeText\(link\)/);
  assert.match(transformed, /Falha ao copiar/);
});

test('joining a server accepts either an invite code or a full invite link', () => {
  assert.match(transformed, /normalizeInviteCode/);
  assert.match(transformed, /\/invite\//);
  assert.match(transformed, /body:\s*JSON\.stringify\(\{\s*code\s*\}\)/);
});

test('add friend is username-only and does not show a discriminator placeholder', () => {
  assert.doesNotMatch(transformed, /nome#0000/);
  assert.match(transformed, /placeholder="nome de usuário"/);
  assert.match(transformed, /JSON\.stringify\(\{username:addFriendName\.trim\(\)\}\)/);
});
