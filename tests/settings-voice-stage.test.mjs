import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chronocordFeatureInteractions } from '../build/chronocord-feature-transform.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src', 'ChronoCord.jsx'), 'utf8');
const transformed = chronocordFeatureInteractions().transform(source, 'C:/repo/src/ChronoCord.jsx')?.code || '';

test('voice stage opens automatically only after a confirmed voice join', () => {
  assert.match(transformed, /async function openVoiceStage\(tryFullscreen = false\)/);

  const joinVoiceStart = transformed.indexOf('async function joinVoice(chanId, chanName)');
  const joinVoiceEnd = transformed.indexOf('function leaveVoice()', joinVoiceStart);
  assert.ok(joinVoiceStart >= 0 && joinVoiceEnd > joinVoiceStart, 'joinVoice function was not found');
  const joinVoiceBlock = transformed.slice(joinVoiceStart, joinVoiceEnd);
  assert.ok(joinVoiceBlock.includes('setVoiceState(v => ({ ...v, connected:true }));'), 'confirmed join should mark voice connected');
  assert.ok(joinVoiceBlock.includes('setVoiceJoinStatus("");'), 'confirmed join should clear the join status');
  assert.ok(joinVoiceBlock.includes('void openVoiceStage(true);'), 'confirmed join should open the voice stage');

  const voiceJoinedStart = transformed.indexOf('socket.on("voice-joined"');
  const voiceJoinedEnd = transformed.indexOf('socket.on("voice-participants"', voiceJoinedStart);
  assert.ok(voiceJoinedStart >= 0 && voiceJoinedEnd > voiceJoinedStart, 'voice-joined handler was not found');
  const voiceJoinedBlock = transformed.slice(voiceJoinedStart, voiceJoinedEnd);
  assert.ok(voiceJoinedBlock.includes('setVoiceStageOpen(true);'), 'voice-joined confirmation should open the stage');
});

test('voice stage fullscreen is best-effort and disconnect always cleans stage state', () => {
  assert.match(transformed, /if\(tryFullscreen && !document\.fullscreenElement\)/);
  assert.match(transformed, /document\.documentElement\.requestFullscreen\?\.\(\)/);
  assert.match(transformed, /function leaveVoice\(\)[\s\S]*setVoiceStageOpen\(false\);/);
  assert.match(transformed, /if \(document\.fullscreenElement\) document\.exitFullscreen\?\.\(\)\.catch\(\(\) => \{\}\);/);
});

test('manual maximize control reuses the same stage-opening path', () => {
  assert.match(transformed, /onClick=\{\(\)\s*=>\s*\{\s*void openVoiceStage\(true\);\s*\}\}\s*title="Abrir tela de voz"/);
  assert.doesNotMatch(transformed, /onClick=\{async \(\) => \{ setVoiceStageOpen\(true\); try \{ await document\.documentElement\.requestFullscreen\?\.\(\); \} catch \{\} \}\}\s*title="Abrir tela de voz"/);
});
