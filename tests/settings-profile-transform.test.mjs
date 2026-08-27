import test from 'node:test';
import assert from 'node:assert/strict';
import { chronocordProfileSummary } from '../build/chronocord-profile-transform.mjs';

const id = 'C:/repo/src/ChronoCord.jsx';

function sourceWithProfileModal() {
  return `import React from "react";\nconst before = true;\n      {fullProfilePage && (\n        <ProfilePage profile={fullProfilePage} />\n      )}\n\n      {/* MODAL: PERFIL */}\n      {profileModal && (\n        <Modal onClose={() => setProfileModal(null)} width={340}>\n          <div>legacy profile modal</div>\n        </Modal>\n      )}\n\n      {/* MODAL: CRIAR / ENTRAR EM ERA */}\n      {addEraOpen && <div>eras</div>}\n`;
}

test('profile transform mounts ProfileSummaryCard and preserves full profile overlay', () => {
  const plugin = chronocordProfileSummary();
  const result = plugin.transform(sourceWithProfileModal(), id);
  assert.ok(result?.code);
  assert.match(result.code, /import ProfileSummaryCard from ['"]\.\/profile\/ProfileSummaryCard\.jsx['"]/);
  assert.match(result.code, /\{fullProfilePage && \(/);
  assert.match(result.code, /<ProfileSummaryCard/);
  assert.match(result.code, /onOpenFullProfile=/);
  assert.match(result.code, /onEditProfile=/);
  assert.match(result.code, /MODAL: CRIAR \/ ENTRAR EM ERA/);
  assert.doesNotMatch(result.code, /legacy profile modal/);
});

test('profile transform leaves non ChronoCord modules untouched', () => {
  const plugin = chronocordProfileSummary();
  assert.equal(plugin.transform(sourceWithProfileModal(), 'C:/repo/src/Other.jsx'), null);
});

test('profile transform refuses to silently build when profile markers disappear', () => {
  const plugin = chronocordProfileSummary();
  assert.throws(
    () => plugin.transform('import React from "react";\nexport default function X(){ return null; }', id),
    /profile modal markers/i,
  );
});
