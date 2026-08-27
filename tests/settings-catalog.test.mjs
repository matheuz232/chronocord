import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHORTCUTS, filterSettingsRoutes, flattenSettingsRoutes, hasShortcutConflict } from '../src/settings/settingsCatalog.js';

const routeIds = () => new Set(flattenSettingsRoutes().map((x) => x.id));

test('catalog contains all approved top-level and nested routes', () => {
  const ids = routeIds();
  for (const id of [
    'account.info', 'account.security', 'account.status', 'account.family',
    'privacy.data', 'privacy.profile', 'privacy.voiceEncryption',
    'messaging.content', 'messaging.spam', 'messaging.dm', 'messaging.friendRequests', 'messaging.games', 'messaging.blocking',
    'notifications.overview', 'notifications.sounds', 'notifications.badges', 'notifications.email', 'notifications.advanced',
    'voice.voice', 'voice.camera', 'voice.stream', 'voice.sounds', 'voice.soundboard', 'voice.advanced',
    'appearance.theme', 'appearance.appIcon', 'appearance.messages', 'appearance.chatBox', 'appearance.search', 'appearance.streamer',
    'accessibility.readability', 'accessibility.density', 'accessibility.contrast', 'accessibility.motion', 'accessibility.screenReader',
    'system.general', 'system.customShortcuts', 'system.defaultShortcuts', 'system.assistant',
    'language', 'registeredGames', 'activityPrivacy', 'gameOverlay', 'connectedApps', 'developer',
  ]) assert.ok(ids.has(id), `missing ${id}`);
});

test('search matches nested labels case and accent insensitively', () => {
  assert.ok(filterSettingsRoutes('atalhos padrão').some((x) => x.id === 'system.defaultShortcuts'));
  assert.ok(filterSettingsRoutes('audio leitor').some((x) => x.id === 'accessibility.screenReader'));
  assert.ok(filterSettingsRoutes('transmissao').some((x) => x.id === 'voice.stream'));
});

test('default shortcut catalog includes message voice and miscellaneous actions', () => {
  const ids = new Set(DEFAULT_SHORTCUTS.map((x) => x.id));
  for (const id of ['message.edit', 'message.delete', 'voice.toggleMute', 'voice.answerCall', 'misc.search', 'misc.contextMenu']) {
    assert.ok(ids.has(id), `missing shortcut ${id}`);
  }
});

test('shortcut conflict detector treats key order and case consistently', () => {
  const custom = [{ id: 'a', keys: ['CTRL', 'SHIFT', 'K'] }];
  assert.equal(hasShortcutConflict(['shift', 'ctrl', 'k'], custom), true);
  assert.equal(hasShortcutConflict(['CTRL', 'ALT', 'K'], custom), false);
});
