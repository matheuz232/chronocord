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
  assert.match(transformed, /setVoiceState\(v => \(\{ \.\.\.v, connected:true \}\)\);\s*setVoiceJoinStatus\(""\);\s*void openVoiceStage\(true\);/);
  assert.match(transformed, /socket\.on\("voice-joined", \(\{channelId,participants\}\) => \{ if\(channelId===voiceChannelRef\.current\) \{ setVoiceState\(v=>\(\{\.\.\.v,connected:true\}\)\); setVoiceStageOpen\(true\); \} \}\);/);
});

test('voice stage fullscreen is best-effort and disconnect always cleans stage state', () => {
  assert.match(transformed, /if\(tryFullscreen && !document\.fullscreenElement\)/);
  assert.match(transformed, /document\.documentElement\.requestFullscreen\?\.\(\)/);
  assert.match(transformed, /function leaveVoice\(\)[\s\S]*setVoiceStageOpen\(false\);/);
  assert.match(transformed, /if \(document\.fullscreenElement\) document\.exitFullscreen\?\.\(\)\.catch\(\(\) => \{\}\);/);
});

test('manual maximize control reuses the same stage-opening path', () => {
  assert.match(transformed, /onClick=\{\(\) => \{ void openVoiceStage\(true\); \}\} title="Abrir tela de voz"/);
});
