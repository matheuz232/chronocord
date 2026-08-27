import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chronocordProductFeatures } from '../build/chronocord-product-transform.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src', 'ChronoCord.jsx'), 'utf8');
const transformed = chronocordProductFeatures().transform(source, 'C:/repo/src/ChronoCord.jsx')?.code || source;

function section(startMarker, endMarker) {
  const start = transformed.indexOf(startMarker);
  assert.ok(start >= 0, `missing section start: ${startMarker}`);
  const end = transformed.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing section end: ${endMarker}`);
  return transformed.slice(start, end);
}

test('opening Watch2Chronos locally holds Jukebox without pausing everyone else', () => {
  assert.match(transformed, /const \[jukeboxLocalHold, setJukeboxLocalHold\] = useState\(false\);/);
  const openBlock = section('function openWatch2Chronos()', 'function closeWatch2Chronos()');
  assert.match(openBlock, /setJukeboxLocalHold\(true\);/);
  assert.match(openBlock, /pauseJukeboxLocalMedia\(\);/);
  assert.match(openBlock, /setWatch2Open\(true\);/);
  assert.doesNotMatch(openBlock, /setIsPlaying\(false\)/, 'opening Watch2 must not change the shared Jukebox play state');

  const closeBlock = section('function closeWatch2Chronos()', 'function w2AddToQueue()');
  assert.match(closeBlock, /setWatch2Open\(false\);/);
  assert.doesNotMatch(closeBlock, /setJukeboxLocalHold\(false\)/, 'closing Watch2 must not auto-resume Jukebox');
});

test('manual Jukebox play is the only path that releases the local Watch2 hold', () => {
  const playBlock = section('async function playJukeboxMedia()', 'function pauseJukeboxMedia()');
  assert.match(playBlock, /setJukeboxLocalHold\(false\);/);
  assert.match(transformed, /const locallyPlaying = isPlaying && !jukeboxLocalHold;/);
  assert.match(transformed, /if \(locallyPlaying\)/);
});

test('Jukebox queue visibility persists locally and queued tracks can be selected', () => {
  assert.match(transformed, /const \[showJukeboxQueue, setShowJukeboxQueue\] = useState\(\(\) =>/);
  assert.match(transformed, /chronocord:jukebox:showQueue/);
  assert.match(transformed, /localStorage\.setItem\("chronocord:jukebox:showQueue", showJukeboxQueue \? "1" : "0"\)/);
  assert.match(transformed, /function selectJukeboxTrack\(track\)/);
  assert.match(transformed, /className="cc-jukebox-queue-item"[^>]*onClick=\{\(\) => selectJukeboxTrack\(t\)\}/);
});

test('Jukebox renders the approved premium shell, artwork backdrop, side queue and background mini-player', () => {
  assert.match(transformed, /className="[^"]*\bcc-jukebox-premium\b[^"]*"/);
  assert.match(transformed, /className="[^"]*\bcc-jukebox-artwork\b[^"]*"/);
  assert.match(transformed, /className="cc-jukebox-queue"/);
  assert.match(transformed, /className="cc-jukebox-mini"/);
  assert.match(transformed, /function jukeboxArtworkUrl\(track\)/);
});
