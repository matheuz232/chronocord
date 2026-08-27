import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const source = readFileSync(new URL('../src/ProfilePage.jsx', import.meta.url), 'utf8');
const cssUrl = new URL('../src/profile/profilePage.css', import.meta.url);

test('full profile keeps the existing persistence contract while using the modern profile shell', () => {
  assert.match(source, /cc_profile_page_v1_/);
  assert.match(source, /import ['"]\.\/profile\/profilePage\.css['"]/);
  for (const marker of ['cc-profile-page-header', 'cc-profile-page-hero', 'cc-profile-page-tabs', 'cc-profile-page-grid', 'cc-profile-page-card']) {
    assert.match(source, new RegExp(marker));
  }
  assert.ok(existsSync(cssUrl), 'profilePage.css must exist');
});

test('full profile still exposes mural activity and wishlist without inventing social data', () => {
  assert.match(source, /Mural/);
  assert.match(source, /Atividade/);
  assert.match(source, /Lista de desejos/);
  assert.doesNotMatch(source, /amigos em comum/i);
  assert.doesNotMatch(source, /servidores em comum/i);
});
