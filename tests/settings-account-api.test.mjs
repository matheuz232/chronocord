import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountApi } from '../src/settings/accountApi.js';

function harness() {
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ ok: true, id: 'export-1' }) };
  };
  const api = createAccountApi(fakeFetch, 'https://chronocord.test', () => 'token-123');
  return { api, calls };
}

const bodyOf = (call) => call.init.body ? JSON.parse(call.init.body) : null;

test('account api sends authenticated account and security requests', async () => {
  const { api, calls } = harness();
  await api.getAccount();
  await api.patchAccount({ email: 'a@b.com' });
  await api.revealPrivate('secret');
  await api.changePassword('old', 'new-password');
  await api.setupMfa('secret');
  await api.enableMfa('123456');
  await api.disableMfa('secret', '123456');
  await api.getSessions();
  await api.revokeSession('sid-1');
  await api.revokeOtherSessions();

  assert.deepEqual(calls.map(c => [c.init.method || 'GET', new URL(c.url).pathname]), [
    ['GET','/api/account'], ['PATCH','/api/account'], ['POST','/api/account/reveal'], ['POST','/api/account/password'],
    ['POST','/api/account/mfa/setup'], ['POST','/api/account/mfa/enable'], ['POST','/api/account/mfa/disable'],
    ['GET','/api/account/sessions'], ['DELETE','/api/account/sessions/sid-1'], ['POST','/api/account/sessions/revoke-others'],
  ]);
  for (const call of calls) assert.equal(call.init.headers.Authorization, 'Bearer token-123');
  assert.deepEqual(bodyOf(calls[1]), { email:'a@b.com' });
  assert.deepEqual(bodyOf(calls[3]), { currentPassword:'old', newPassword:'new-password' });
});

test('account api covers preferences blocking export and lifecycle', async () => {
  const { api, calls } = harness();
  await api.getPreferences();
  await api.patchPreferences({ improveProduct:false });
  await api.getBlocks();
  await api.blockUser('u-2');
  await api.unblockUser('u-2');
  await api.requestDataExport();
  await api.getDataExport('export-1');
  await api.deactivate('secret');
  await api.deleteAccount('secret');
  await api.reactivate('me','secret');

  assert.deepEqual(calls.map(c => [c.init.method || 'GET', new URL(c.url).pathname]), [
    ['GET','/api/preferences'], ['PATCH','/api/preferences'], ['GET','/api/blocks'], ['POST','/api/blocks/u-2'], ['DELETE','/api/blocks/u-2'],
    ['POST','/api/data-export'], ['GET','/api/data-export/export-1'], ['POST','/api/account/deactivate'], ['POST','/api/account/delete'], ['POST','/api/account/reactivate'],
  ]);
  assert.equal(calls.at(-1).init.headers.Authorization, undefined);
  assert.deepEqual(bodyOf(calls.at(-1)), { username:'me', password:'secret' });
});

test('account api surfaces server error messages', async () => {
  const fakeFetch = async () => ({ ok:false, status:409, json:async()=>({ error:'Conflito real' }) });
  const api = createAccountApi(fakeFetch, 'https://chronocord.test', ()=>'token');
  await assert.rejects(() => api.patchAccount({ username:'x' }), /Conflito real/);
});
