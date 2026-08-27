import React, { useEffect, useMemo, useState } from 'react';
import { buildProfileSummary, formatElapsedActivity } from './profileSummaryModel.js';
import './profileSummary.css';

function profileKey(profile) {
  return String(profile?.id || profile?.userId || profile?.name || 'me').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function readLocalProfile(profile) {
  try {
    const raw = localStorage.getItem(`cc_profile_page_v1_${profileKey(profile)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function mergeProfileData(profile) {
  const local = readLocalProfile(profile);
  if (!local) return profile;
  const latestActivity = Array.isArray(local.activity) ? local.activity[0] : local.activity;
  return {
    ...profile,
    about: profile?.about || local.intro || null,
    favoriteGames: Array.isArray(profile?.favoriteGames) && profile.favoriteGames.length ? profile.favoriteGames : local.favoriteGames,
    wantGames: Array.isArray(profile?.wantGames) && profile.wantGames.length ? profile.wantGames : local.wantGames,
    activity: profile?.activity || latestActivity || null,
  };
}

function itemImage(item) {
  return item?.image || item?.cover || item?.imgSrc || item?.thumbnail || null;
}

function itemLabel(item) {
  if (typeof item === 'string') return item;
  return item?.title || item?.name || item?.label || 'Item';
}

function formatMemberSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

function rgbToHex(r, g, b) {
  const part = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function imageAccent(source, fallback) {
  return new Promise((resolve) => {
    if (!source || typeof document === 'undefined') return resolve(fallback);
    const image = new Image();
    if (/^https?:/i.test(source)) image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(fallback);
        ctx.drawImage(image, 0, 0, 16, 16);
        const pixels = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, weight = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3] / 255;
          const max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
          const min = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
          const saturation = max - min;
          const w = alpha * (0.35 + saturation / 255);
          r += pixels[i] * w;
          g += pixels[i + 1] * w;
          b += pixels[i + 2] * w;
          weight += w;
        }
        resolve(weight ? rgbToHex(r / weight, g / weight, b / weight) : fallback);
      } catch {
        resolve(fallback);
      }
    };
    image.onerror = () => resolve(fallback);
    image.src = source;
  });
}

function ProfileThumb({ item, className }) {
  const src = itemImage(item);
  const label = itemLabel(item);
  return <div className={className} title={label}>{src ? <img src={src} alt="" /> : <span>{label}</span>}</div>;
}

export default function ProfileSummaryCard({ profile, isMe = false, T = {}, themeColor = '#9b4dff', onClose, onOpenFullProfile, onEditProfile }) {
  const merged = useMemo(() => mergeProfileData(profile || {}), [profile]);
  const summary = useMemo(() => buildProfileSummary(merged), [merged]);
  const banner = typeof summary.banner === 'string' ? summary.banner : summary.banner?.src || null;
  const [accent, setAccent] = useState(summary.color || themeColor || '#9b4dff');
  const [elapsed, setElapsed] = useState(() => formatElapsedActivity(summary.activity?.startedAt));

  useEffect(() => {
    let active = true;
    imageAccent(banner || summary.avatar, summary.color || themeColor || '#9b4dff').then((next) => active && setAccent(next));
    return () => { active = false; };
  }, [banner, summary.avatar, summary.color, themeColor]);

  useEffect(() => {
    const update = () => setElapsed(formatElapsedActivity(summary.activity?.startedAt));
    update();
    if (!summary.activity?.startedAt) return undefined;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [summary.activity?.startedAt]);

  const memberSince = formatMemberSince(summary.memberSince);
  const statusClass = summary.status === 'online' ? 'is-online' : summary.status === 'idle' ? 'is-idle' : summary.status === 'dnd' ? 'is-dnd' : '';
  const gamePreview = summary.gamePreview || [];
  const wishlistPreview = summary.wishlistPreview || [];
  const mutuals = [...(summary.mutualFriends || []), ...(summary.mutualServers || [])];
  const activity = summary.activity;
  const activityImage = itemImage(activity);
  const activityTitle = itemLabel(activity);
  const activityDetail = activity?.detail || activity?.details || activity?.state || null;
  const initials = summary.name.slice(0, 2).toUpperCase();
  const bannerStyle = banner ? { backgroundImage: `url(${banner})` } : undefined;

  function openExternal() {
    if (!summary.externalUrl) return;
    try { window.open(summary.externalUrl, '_blank', 'noopener,noreferrer'); } catch {}
  }

  return (
    <div className="cc-profile-summary" style={{ '--profile-accent': accent, '--profile-text': T.textMain || '#fff' }}>
      <div className="cc-profile-summary-banner" style={bannerStyle}>
        <div className="cc-profile-summary-actions">
          {isMe && onEditProfile && <button type="button" className="cc-profile-summary-action" onClick={onEditProfile} title="Editar perfil">✎</button>}
          <button type="button" className="cc-profile-summary-action" onClick={onClose} title="Fechar">×</button>
        </div>
        <div className="cc-profile-summary-avatar-wrap">
          <div className="cc-profile-summary-avatar">{summary.avatar ? <img src={summary.avatar} alt={summary.name} /> : initials}</div>
          <span className={`cc-profile-summary-presence ${statusClass}`} title={summary.status} />
          {summary.decoration && <div className="cc-profile-decoration"><img src={summary.decoration} alt="" /></div>}
        </div>
      </div>

      <div className="cc-profile-summary-body">
        {summary.customStatus && <div className="cc-profile-summary-status"><span>✦</span><span>{summary.customStatus}</span></div>}
        <div className="cc-profile-summary-name">{summary.name}</div>
        <div className="cc-profile-summary-handle">
          {summary.username && <span>@{summary.username}</span>}
          {summary.pronouns && <span>· {summary.pronouns}</span>}
          {summary.role && <span className="cc-profile-chip">{summary.role}</span>}
          {(summary.chips || []).map((chip, index) => <span key={`${itemLabel(chip)}-${index}`} className="cc-profile-chip">{itemLabel(chip)}</span>)}
        </div>

        {!!summary.badges?.length && <div className="cc-profile-badges">{summary.badges.map((badge, index) => <span key={`${itemLabel(badge)}-${index}`} className="cc-profile-badge" title={itemLabel(badge)}>{typeof badge === 'string' ? badge.slice(0, 2) : (badge.icon || itemLabel(badge).slice(0, 2))}</span>)}</div>}

        {!!mutuals.length && <div className="cc-profile-mutuals"><div className="cc-profile-mutual-stack">{mutuals.slice(0, 4).map((person, index) => <div className="cc-profile-mutual-dot" key={`${itemLabel(person)}-${index}`}>{itemImage(person) ? <img src={itemImage(person)} alt="" /> : itemLabel(person).slice(0, 1).toUpperCase()}</div>)}</div><span>{summary.mutualFriends.length ? `${summary.mutualFriends.length} amigo${summary.mutualFriends.length === 1 ? '' : 's'} em comum` : ''}{summary.mutualFriends.length && summary.mutualServers.length ? ' · ' : ''}{summary.mutualServers.length ? `${summary.mutualServers.length} servidor${summary.mutualServers.length === 1 ? '' : 'es'} em comum` : ''}</span></div>}

        {summary.about && <section className="cc-profile-summary-section"><div className="cc-profile-summary-section-title">Sobre mim</div><div className="cc-profile-summary-bio">{summary.about}</div></section>}

        {memberSince && <section className="cc-profile-summary-section"><div className="cc-profile-summary-section-title">Membro desde</div><div className="cc-profile-summary-date">{memberSince}</div></section>}

        {!!gamePreview.length && <section className="cc-profile-summary-section"><div className="cc-profile-summary-section-title">Jogos</div><div className="cc-profile-summary-panel"><div className="cc-profile-games">{gamePreview.map((game, index) => <ProfileThumb key={`${itemLabel(game)}-${index}`} item={game} className="cc-profile-game-thumb" />)}{summary.gameOverflow > 0 && <div className="cc-profile-game-more">+{summary.gameOverflow}</div>}</div></div></section>}

        {activity && <section className="cc-profile-summary-section"><div className="cc-profile-summary-section-title">Atividade</div><div className="cc-profile-activity"><div className="cc-profile-activity-head"><div className="cc-profile-activity-cover">{activityImage ? <img src={activityImage} alt="" /> : '◈'}</div><div className="cc-profile-activity-copy"><strong>{activityTitle}</strong>{activityDetail && <span>{activityDetail}</span>}{elapsed && <span>{elapsed}</span>}</div></div>{summary.externalUrl && <button type="button" className="cc-profile-external" onClick={openExternal}>Abrir atividade</button>}</div></section>}

        {!!wishlistPreview.length && <section className="cc-profile-summary-section"><div className="cc-profile-summary-panel"><div className="cc-profile-wishlist-head"><span>Lista de desejos</span></div><div className="cc-profile-wishlist">{wishlistPreview.map((item, index) => <ProfileThumb key={`${itemLabel(item)}-${index}`} item={item} className="cc-profile-wish" />)}</div></div></section>}

        {onOpenFullProfile && <button type="button" className="cc-profile-full-button" onClick={onOpenFullProfile}>Ver perfil completo</button>}
      </div>
    </div>
  );
}
