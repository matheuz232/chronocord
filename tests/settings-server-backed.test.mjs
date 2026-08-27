import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const REAL_ACCOUNT_BINDINGS = /createAccountApi|accountApi\s*=|accountApi\.|changePassword\s*\(|setupMfa\s*\(|enableMfa\s*\(|disableMfa\s*\(|revokeSession\s*\(|revokeOtherSessions\s*\(|deleteAccount\s*\(|deactivate\s*\(/;

test('ChronoCord 1.0.3 Settings Center does not inject authenticated account-security APIs', () => {
  const transform = read('build/chronocord-settings-transform.mjs');
  const center = read('src/settings/SettingsCenter.jsx');

  assert.match(transform, /<SettingsCenter/);
  assert.doesNotMatch(transform, /createAccountApi/);
  assert.doesNotMatch(transform, /accountApi=/);
  assert.doesNotMatch(center, /accountApi/);
});

test('account security and lifecycle controls remain local-only in 1.0.3', () => {
  const source = read('src/settings/pages/AccountSettings.jsx');
  assert.doesNotMatch(source, REAL_ACCOUNT_BINDINGS);
  assert.match(source, /A troca real de senha será conectada ao backend final\./);
  assert.match(source, /nenhum segredo MFA é armazenado/i);
  assert.match(source, /sua conta no servidor não será removida/i);
  assert.match(source, /deletePhrase !== 'EXCLUIR'/);
});

test('privacy and message permissions persist only local preferences in this release', () => {
  const privacy = read('src/settings/pages/PrivacySettings.jsx');
  const messaging = read('src/settings/pages/MessagePermissionsSettings.jsx');

  assert.doesNotMatch(privacy, /accountApi|createAccountApi/);
  assert.doesNotMatch(messaging, /accountApi|createAccountApi/);
  assert.match(privacy, /A solicitação real ao servidor será implementada na versão final\./);
  assert.match(privacy, /não afirma aplicar criptografia ponta a ponta/i);
  assert.match(messaging, /A lista abaixo é local nesta fase\./);
});

test('email notification choices are explicitly local and do not claim delivery', () => {
  const source = read('src/settings/pages/NotificationSettings.jsx');
  assert.doesNotMatch(source, /accountApi|createAccountApi/);
  assert.match(source, /Preferência local/);
  assert.match(source, /Somente preferência local nesta etapa\./);
});
