import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileSummary, formatElapsedActivity, normalizeExternalUrl } from '../src/profile/profileSummaryModel.js';

test('profile summary never invents social, game or wishlist data', () => {
  const result = buildProfileSummary({ name: 'Luna' });
  assert.equal(result.name, 'Luna');
  assert.deepEqual(result.mutualFriends, []);
  assert.deepEqual(result.mutualServers, []);
  assert.deepEqual(result.games, []);
  assert.deepEqual(result.wishlist, []);
  assert.equal(result.activity, null);
  assert.equal(result.externalUrl, null);
});

test('profile summary preserves real supplied data and caps preview collections', () => {
  const profile = {
    name: 'Luna',
    mutualFriends: [{ id: 'a' }, { id: 'b' }],
    mutualServers: [{ id: 's1' }],
    games: Array.from({ length: 9 }, (_, i) => ({ id: `g${i}`, title: `Game ${i}` })),
    wishlist: Array.from({ length: 7 }, (_, i) => ({ id: `w${i}`, title: `Wish ${i}` })),
    activity: { title: 'Chrono Quest', startedAt: '2026-08-27T00:00:00Z', externalUrl: 'https://store.example/game' },
  };
  const result = buildProfileSummary(profile);
  assert.equal(result.mutualFriends.length, 2);
  assert.equal(result.mutualServers.length, 1);
  assert.equal(result.games.length, 9);
  assert.equal(result.gamePreview.length, 4);
  assert.equal(result.gameOverflow, 5);
  assert.equal(result.wishlistPreview.length, 4);
  assert.equal(result.activity.title, 'Chrono Quest');
  assert.equal(result.externalUrl, 'https://store.example/game');
});

test('external profile activity links accept only http or https URLs', () => {
  assert.equal(normalizeExternalUrl('https://store.example/a'), 'https://store.example/a');
  assert.equal(normalizeExternalUrl('http://localhost/game'), 'http://localhost/game');
  assert.equal(normalizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(normalizeExternalUrl('not a url'), null);
});

test('elapsed activity formatting is stable', () => {
  assert.equal(formatElapsedActivity('2026-08-27T00:00:00Z', new Date('2026-08-27T01:02:03Z')), '1:02:03');
  assert.equal(formatElapsedActivity(null, new Date()), null);
});
