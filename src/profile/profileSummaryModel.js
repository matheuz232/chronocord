export function normalizeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function buildProfileSummary(profile = {}) {
  const mutualFriends = cleanArray(profile.mutualFriends);
  const mutualServers = cleanArray(profile.mutualServers);
  const games = cleanArray(profile.games || profile.favoriteGames);
  const wishlist = cleanArray(profile.wishlist || profile.wantGames);
  const activity = profile.activity && typeof profile.activity === 'object' ? { ...profile.activity } : null;
  const externalUrl = normalizeExternalUrl(activity?.externalUrl || activity?.url || profile.externalUrl);
  return {
    id: profile.id || profile.userId || null,
    name: profile.name || profile.username || 'Usuário',
    username: profile.username || null,
    role: profile.role || null,
    pronouns: profile.pronouns || null,
    avatar: profile.avatar || profile.imgSrc || null,
    banner: profile.banner || null,
    decoration: profile.decoration || null,
    color: profile.color || null,
    status: profile.status || 'offline',
    customStatus: profile.customStatus || profile.statusText || null,
    about: profile.about || profile.aboutMe || null,
    memberSince: profile.memberSince || profile.createdAt || null,
    badges: cleanArray(profile.badges),
    chips: cleanArray(profile.chips),
    mutualFriends,
    mutualServers,
    games,
    gamePreview: games.slice(0, 4),
    gameOverflow: Math.max(0, games.length - 4),
    wishlist,
    wishlistPreview: wishlist.slice(0, 4),
    activity,
    externalUrl,
  };
}

export function formatElapsedActivity(startedAt, now = new Date()) {
  if (!startedAt) return null;
  const start = new Date(startedAt);
  const end = now instanceof Date ? now : new Date(now);
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
