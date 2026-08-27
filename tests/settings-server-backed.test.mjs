import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('settings transform injects authenticated account api into SettingsCenter', () => {
  const source = read('build/chronocord-settings-transform.mjs');
  assert.match(source, /createAccountApi/);
  assert.match(source, /accountApi=\{createAccountApi\(serverFetch, SERVER_URL, \(\) => authToken\)\}/);
});

test('account settings use real account security endpoints instead of local simulation', () => {
  const source = read('src/settings/pages/AccountSettings.jsx');
  for (const method of ['getAccount','patchAccount','revealPrivate','changePassword','setupMfa','enableMfa','disableMfa','getSessions','revokeSession','revokeOtherSessions','deactivate','deleteAccount']) {
    assert.ok(source.includes(`accountApi.${method}`), `missing ${method}`);
  }
  assert.equal(/Somente interface local|apenas local|simula a desativação|simular exclusão/i.test(source), false);
  assert.match(source, /Disponível em uma versão futura/);
});

test('privacy and message pages persist server preferences and real exports or blocks', () => {
  const privacy = read('src/settings/pages/PrivacySettings.jsx');
  assert.match(privacy, /accountApi\.patchPreferences/);
  assert.match(privacy, /accountApi\.requestDataExport/);
  assert.match(privacy, /accountApi\.getDataExport/);
  assert.match(privacy, /WebRTC/);
  assert.match(privacy, /disabled/);

  const messaging = read('src/settings/pages/MessagePermissionsSettings.jsx');
  assert.match(messaging, /accountApi\.patchPreferences/);
  assert.match(messaging, /accountApi\.getBlocks/);
  assert.match(messaging, /accountApi\.unblockUser/);
});

test('email notification preferences are server backed without claiming delivery', () => {
  const source = read('src/settings/pages/NotificationSettings.jsx');
  assert.match(source, /accountApi\.patchPreferences/);
  assert.match(source, /serviço de e-mail.*configurado/i);
});
