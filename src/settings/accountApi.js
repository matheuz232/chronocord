export function createAccountApi(serverFetch, baseUrl, getToken) {
  if (typeof serverFetch !== 'function') throw new TypeError('serverFetch precisa ser uma função.');
  const root = String(baseUrl || '').replace(/\/$/, '');

  async function request(path, { method = 'GET', body, auth = true } = {}) {
    const token = auth ? String(getToken?.() || '') : '';
    const headers = {};
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await serverFetch(`${root}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `Falha no ChronoCord (HTTP ${response.status}).`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  const enc = (value) => encodeURIComponent(String(value));
  return {
    getAccount: () => request('/api/account'),
    patchAccount: (patch) => request('/api/account', { method: 'PATCH', body: patch }),
    revealPrivate: (password) => request('/api/account/reveal', { method: 'POST', body: { password } }),
    changePassword: (currentPassword, newPassword) => request('/api/account/password', { method: 'POST', body: { currentPassword, newPassword } }),
    setupMfa: (password) => request('/api/account/mfa/setup', { method: 'POST', body: { password } }),
    enableMfa: (code) => request('/api/account/mfa/enable', { method: 'POST', body: { code } }),
    disableMfa: (password, code) => request('/api/account/mfa/disable', { method: 'POST', body: { password, code } }),
    getSessions: () => request('/api/account/sessions'),
    revokeSession: (sid) => request(`/api/account/sessions/${enc(sid)}`, { method: 'DELETE' }),
    revokeOtherSessions: () => request('/api/account/sessions/revoke-others', { method: 'POST', body: {} }),
    getPreferences: () => request('/api/preferences'),
    patchPreferences: (patch) => request('/api/preferences', { method: 'PATCH', body: patch }),
    getBlocks: () => request('/api/blocks'),
    blockUser: (userId) => request(`/api/blocks/${enc(userId)}`, { method: 'POST', body: {} }),
    unblockUser: (userId) => request(`/api/blocks/${enc(userId)}`, { method: 'DELETE' }),
    requestDataExport: () => request('/api/data-export', { method: 'POST', body: {} }),
    getDataExport: (id) => request(`/api/data-export/${enc(id)}`),
    deactivate: (password) => request('/api/account/deactivate', { method: 'POST', body: { password } }),
    deleteAccount: (password) => request('/api/account/delete', { method: 'POST', body: { password } }),
    reactivate: (username, password) => request('/api/account/reactivate', { method: 'POST', body: { username, password }, auth: false }),
  };
}
