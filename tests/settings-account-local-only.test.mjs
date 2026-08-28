import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const accountSettingsSource = readFileSync(
  new URL('../src/settings/pages/AccountSettings.jsx', import.meta.url),
  'utf8',
);

test('ChronoCord 1.0.4 keeps account security controls local-only', () => {
  const forbiddenRealSecurityBindings = [
    /accountApi/,
    /changePassword\s*\(/,
    /setupMfa\s*\(/,
    /enableMfa\s*\(/,
    /disableMfa\s*\(/,
    /revokeSession\s*\(/,
    /revokeOtherSessions\s*\(/,
    /deleteAccount\s*\(/,
    /deactivate\s*\(/,
    /revealPrivate\s*\(/,
  ];

  for (const binding of forbiddenRealSecurityBindings) {
    assert.doesNotMatch(accountSettingsSource, binding);
  }

  assert.match(accountSettingsSource, /A troca real de senha será conectada ao backend final\./);
  assert.match(accountSettingsSource, /nenhum segredo MFA é armazenado/i);
  assert.match(accountSettingsSource, /sua conta no servidor não será removida/i);
  assert.match(accountSettingsSource, /deletePhrase !== 'EXCLUIR'/);
  assert.match(accountSettingsSource, /Nenhum dado real do servidor será apagado\./);
});
