import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mainSource = readFileSync(resolve(root, 'electron', 'main.cjs'), 'utf8');
const preloadSource = readFileSync(resolve(root, 'electron', 'preload.cjs'), 'utf8');
const viteSource = readFileSync(resolve(root, 'vite.config.js'), 'utf8');
const screenShareTransform = readFileSync(resolve(root, 'build', 'chronocord-screen-share-transform.mjs'), 'utf8');

test('Electron exposes a bounded desktop source picker instead of silently choosing an arbitrary window', () => {
  assert.match(preloadSource, /getDesktopSources:\s*\(options\s*=\s*\{\}\)\s*=>\s*ipcRenderer\.invoke\('media:get-desktop-sources'/);
  assert.match(mainSource, /ipcMain\.handle\('media:get-desktop-sources'/);
  assert.match(mainSource, /desktopCapturer\.getSources\(\{\s*types:\s*\['screen',\s*'window'\]/);
  assert.match(mainSource, /thumbnail:\s*source\.thumbnail\.toDataURL\(\)/);
  assert.match(mainSource, /appIcon:\s*source\.appIcon\?\.toDataURL\(\)\s*\|\|\s*null/);
});

test('screen share transform captures the exact selected source and validates live video frames before WebRTC', () => {
  assert.match(screenShareTransform, /getDesktopSources/);
  assert.match(screenShareTransform, /chromeMediaSourceId/);
  assert.match(screenShareTransform, /chromeMediaSource:\s*'desktop'/);
  assert.match(screenShareTransform, /requestVideoFrameCallback/);
  assert.match(screenShareTransform, /videoWidth/);
  assert.match(screenShareTransform, /track\.readyState\s*!==\s*'live'/);
  assert.match(screenShareTransform, /replacePeerVideoTrack\(track\)/);
});

test('screen source picker is integrated into the Vite pipeline with a usable accessible UI', () => {
  assert.match(viteSource, /chronocordScreenShare/);
  assert.match(screenShareTransform, /cc-screen-share-picker/);
  assert.match(screenShareTransform, /Escolha o que compartilhar/);
  assert.match(screenShareTransform, /aria-label="Fechar seletor de compartilhamento"/);
  assert.match(screenShareTransform, /Compartilhar esta fonte/);
});
