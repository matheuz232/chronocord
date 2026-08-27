import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../src/settings/settingsDefaults.js';
import { loadSettings, saveSettings, settingsStorageKey, patchSettingsPath, resetSettingsSubtree } from '../src/settings/settingsStorage.js';

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test('settings key is namespaced per user', () => {
  assert.equal(settingsStorageKey('abc'), 'chronocord.settings.v2.abc');
  assert.notEqual(settingsStorageKey('abc'), settingsStorageKey('xyz'));
});

test('loadSettings fills missing nested defaults', () => {
  const storage = fakeStorage({
    'chronocord.settings.v2.abc': JSON.stringify({ schemaVersion: 2, privacy: { improveProduct: true } }),
  });
  const loaded = loadSettings('abc', storage);
  assert.equal(loaded.privacy.improveProduct, true);
  assert.equal(loaded.notifications.desktopEnabled, createDefaultSettings().notifications.desktopEnabled);
  assert.equal(loaded.system.developerMode, false);
  assert.equal(loaded.appearance.streamer.hidePersonalData, true);
  assert.equal(loaded.accessibility.chatFontSize, 16);
  assert.equal(loaded.voiceVideo.streamPreviews, true);
});

test('invalid persisted JSON falls back to defaults', () => {
  const storage = fakeStorage({ 'chronocord.settings.v2.abc': '{bad json' });
  assert.deepEqual(loadSettings('abc', storage), createDefaultSettings());
});

test('saveSettings never changes the namespace of another user', () => {
  const storage = fakeStorage();
  saveSettings('abc', createDefaultSettings(), storage);
  assert.ok(storage.getItem('chronocord.settings.v2.abc'));
  assert.equal(storage.getItem('chronocord.settings.v2.xyz'), null);
});

test('defaults include the complete approved visual delta', () => {
  const value = createDefaultSettings();
  assert.equal(value.schemaVersion, 2);
  assert.equal(value.voiceVideo.soundboardVolume, 100);
  assert.equal(value.voiceVideo.soundEvents.deafen, true);
  assert.equal(value.appearance.media.spoilers, 'click');
  assert.equal(value.appearance.chatBox.autocompleteStickers, false);
  assert.equal(value.appearance.dmSearchScope, 'selected');
  assert.equal(value.accessibility.interfaceDensity, 'default');
  assert.equal(value.accessibility.saturation, 100);
  assert.equal(value.accessibility.stickerAnimation, 'always');
  assert.equal(value.accessibility.ttsRate, 1);
  assert.equal(value.system.openOnStartup, false);
  assert.equal(value.system.minimizeToTray, true);
  assert.equal(value.system.hardwareAcceleration, true);
});

test('patchSettingsPath changes only the requested leaf', () => {
  const initial = createDefaultSettings();
  const next = patchSettingsPath(initial, 'appearance.streamer.enabled', true);
  assert.equal(next.appearance.streamer.enabled, true);
  assert.equal(next.appearance.streamer.hidePersonalData, initial.appearance.streamer.hidePersonalData);
  assert.equal(initial.appearance.streamer.enabled, false);
});

test('resetSettingsSubtree resets voice preferences without touching unrelated settings', () => {
  let value = createDefaultSettings();
  value = patchSettingsPath(value, 'voiceVideo.streamPreviews', false);
  value = patchSettingsPath(value, 'appearance.streamer.enabled', true);
  const reset = resetSettingsSubtree(value, 'voiceVideo');
  assert.equal(reset.voiceVideo.streamPreviews, true);
  assert.equal(reset.appearance.streamer.enabled, true);
});

test('fresh defaults never share mutable arrays', () => {
  const first = createDefaultSettings();
  const second = createDefaultSettings();
  first.messaging.blockedUsers.push({ id: 'x' });
  first.system.customShortcuts.push({ id: 'custom' });
  assert.equal(second.messaging.blockedUsers.length, 0);
  assert.equal(second.system.customShortcuts.length, 0);
});
