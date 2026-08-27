import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chronocordScreenShare } from '../build/chronocord-screen-share-transform.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bootstrapSource = readFileSync(resolve(root, 'electron', 'bootstrap.cjs'), 'utf8');
const preloadSource = readFileSync(resolve(root, 'electron', 'preload.cjs'), 'utf8');
const viteSource = readFileSync(resolve(root, 'vite.config.js'), 'utf8');
const screenShareTransform = readFileSync(resolve(root, 'build', 'chronocord-screen-share-transform.mjs'), 'utf8');
const appSource = readFileSync(resolve(root, 'src', 'ChronoCord.jsx'), 'utf8');
const transformedApp = chronocordScreenShare().transform(appSource, 'C:/repo/src/ChronoCord.jsx')?.code || '';

test('Electron exposes a bounded desktop source picker without granting an arbitrary capture source', () => {
  assert.match(preloadSource, /getDesktopSources:\s*\(options\s*=\s*\{\}\)\s*=>\s*ipcRenderer\.invoke\('media:get-desktop-sources'/);
  assert.match(bootstrapSource, /ipcMain\.handle\('media:get-desktop-sources'/);
  assert.match(bootstrapSource, /types:\s*\['screen',\s*'window'\]/);
  assert.match(bootstrapSource, /thumbnailSize:\s*\{\s*width:\s*320,\s*height:\s*180\s*\}/);
  assert.match(bootstrapSource, /fetchWindowIcons:\s*true/);
  assert.match(bootstrapSource, /thumbnail:\s*source\.thumbnail\?\.isEmpty\?\.\(\)\s*\?\s*''\s*:\s*\(source\.thumbnail\?\.toDataURL\?\.\(\)\s*\|\|\s*''\)/);
  assert.match(bootstrapSource, /appIcon:\s*source\.appIcon\?\.isEmpty\?\.\(\)\s*\?\s*null\s*:\s*\(source\.appIcon\?\.toDataURL\?\.\(\)\s*\|\|\s*null\)/);
});

test('screen share transform captures the exact selected source and validates live video frames before WebRTC', () => {
  assert.match(screenShareTransform, /getDesktopSources/);
  assert.match(screenShareTransform, /chromeMediaSourceId/);
  assert.match(screenShareTransform, /chromeMediaSource:\s*'desktop'/);
  assert.match(screenShareTransform, /requestVideoFrameCallback/);
  assert.match(screenShareTransform, /videoWidth/);
  assert.match(screenShareTransform, /track\.readyState\s*!==\s*'live'/);
  assert.match(screenShareTransform, /replacePeerVideoTrack\(track\)/);
  assert.match(transformedApp, /captureVoiceScreenSource/);
});

test('opening and cancelling the source picker keeps the camera alive until a valid screen frame is ready', () => {
  assert.match(transformedApp, /const previousKind=localVideoKindRef\.current/);
  assert.match(transformedApp, /if\(previousKind==='camera'\)setVoiceCameraOn\(false\)/);
  const toggleStart = transformedApp.indexOf('async function toggleVoiceScreen()');
  const toggleEnd = transformedApp.indexOf('async function waitForSocketConnected', toggleStart);
  const toggleBody = transformedApp.slice(toggleStart, toggleEnd);
  assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, 'transformed toggleVoiceScreen block was not found');
  assert.doesNotMatch(toggleBody, /stopLocalVideo\('camera'\)/);
});

test('screen source picker is integrated into the Vite pipeline with a usable accessible UI', () => {
  assert.match(viteSource, /chronocordScreenShare/);
  assert.match(transformedApp, /cc-screen-share-picker/);
  assert.match(transformedApp, /Escolha o que compartilhar/);
  assert.match(transformedApp, /aria-label="Fechar seletor de compartilhamento"/);
  assert.match(transformedApp, /Compartilhar esta fonte/);
  assert.match(transformedApp, /closeScreenSharePicker/);
});
