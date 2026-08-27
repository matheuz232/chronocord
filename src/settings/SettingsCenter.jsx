import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './settings.css';
import SettingsSidebar from './components/SettingsSidebar.jsx';
import AccountSettings from './pages/AccountSettings.jsx';
import PrivacySettings from './pages/PrivacySettings.jsx';
import MessagePermissionsSettings from './pages/MessagePermissionsSettings.jsx';
import NotificationSettings from './pages/NotificationSettings.jsx';
import VoiceVideoSettings from './pages/VoiceVideoSettings.jsx';
import AppearanceSettings from './pages/AppearanceSettings.jsx';
import AccessibilitySettings from './pages/AccessibilitySettings.jsx';
import SystemSettings, { DeveloperSettings } from './pages/SystemSettings.jsx';
import ProfileEditSettings from './pages/ProfileEditSettings.jsx';
import MiscSettings from './pages/MiscSettings.jsx';
import { SETTINGS_GROUPS } from './settingsCatalog.js';
import { loadSettings, patchSettingsPath, resetSettingsSubtree, saveSettings } from './settingsStorage.js';

const LEGACY_ROUTE_MAP = {
  conta: 'account.info', perfil: 'profile.edit', privacidade: 'privacy.data', permissoes: 'messaging.content', notificacoes: 'notifications.overview',
  voz: 'voice.voice', camera: 'voice.camera', transmissao: 'voice.stream', sons: 'voice.sounds', soundboard: 'voice.soundboard', avancado: 'developer',
  acessibilidade: 'accessibility.readability', sistema: 'system.general', idioma: 'language', aparencia: 'appearance.theme',
};

function routeGroup(route) { if (route === 'profile.edit') return 'profile'; if (route?.includes('.')) return route.split('.')[0]; return route || 'account'; }
function routeTitle(route) {
  if (route === 'profile.edit') return 'Editar perfil';
  const group = SETTINGS_GROUPS.find((item) => item.id === routeGroup(route));
  if (group) return group.label;
  return ({ language:'Idioma e Horário', registeredGames:'Jogos registrados', activityPrivacy:'Privacidade nas atividades', gameOverlay:'Sobreposição de jogo', connectedApps:'Apps conectados', developer:'Desenvolvedor' })[route] || 'Configurações';
}

export default function SettingsCenter({ user, profile, T, themeColor, accountApi, onClose, onLogout, legacy = {} }) {
  const userId = String(user?.id || user?.username || 'guest');
  const initial = useMemo(() => loadSettings(userId), [userId]);
  const legacyRoute = LEGACY_ROUTE_MAP[legacy?.settingsTab];
  const [settings, setSettings] = useState(initial);
  const [route, setRoute] = useState(legacyRoute || initial.ui?.lastSettingsRoute || 'account.info');
  const [query, setQuery] = useState('');
  const settingsRef = useRef(settings);
  const scrollRef = useRef(null);

  useEffect(() => {
    const loaded = loadSettings(userId);
    settingsRef.current = loaded; setSettings(loaded);
    setRoute(LEGACY_ROUTE_MAP[legacy?.settingsTab] || loaded.ui?.lastSettingsRoute || 'account.info');
  }, [userId]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { const timer = setTimeout(() => saveSettings(userId, settings), 200); return () => clearTimeout(timer); }, [settings, userId]);
  useEffect(() => () => { try { saveSettings(userId, settingsRef.current); } catch {} }, [userId]);

  const patch = useCallback((path, value) => { setSettings((current) => patchSettingsPath(current, path, typeof value === 'function' ? value(current) : value)); }, []);
  const resetSubtree = useCallback((path) => { setSettings((current) => resetSettingsSubtree(current, path)); }, []);
  const navigate = useCallback((nextRoute) => { if (!nextRoute) return; setRoute(nextRoute); setSettings((current) => patchSettingsPath(current, 'ui.lastSettingsRoute', nextRoute)); setQuery(''); }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const host = scrollRef.current; if (!host) return;
      [...host.querySelectorAll('[data-settings-route]')].find((node) => node.dataset.settingsRoute === route)?.scrollIntoView?.({ behavior:'smooth', block:'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [route]);

  const legacyWithNavigation = useMemo(() => ({ ...legacy, openProfileEditor: () => navigate('profile.edit') }), [legacy, navigate]);
  const page = renderPage(route, { settings, patch, resetSubtree, user, profile, T, themeColor, navigate, accountApi, legacy:legacyWithNavigation });

  const cssVars = {
    '--cc-bg-0': T?.bg0 || '#0E0C18', '--cc-bg-1': T?.bg1 || '#151228', '--cc-bg-2': T?.bg2 || '#1B1832', '--cc-bg-3': T?.bg3 || '#211D3D', '--cc-bg-4': T?.bg4 || '#262146',
    '--cc-border': T?.border || '#332C57', '--cc-text-main': T?.textMain || '#EFEBFB', '--cc-text-dim': T?.textDim || '#9A93B8', '--cc-text-faint': T?.textFaint || '#6A6390',
    '--cc-accent': themeColor || '#9B4DFF', '--cc-accent-text': T?.text || '#fff',
  };
  const close = () => { try { saveSettings(userId, settingsRef.current); } catch {} onClose?.(); };

  return (
    <div className="cc-settings-root" style={cssVars} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="cc-settings-window" role="dialog" aria-modal="true" aria-label="Configurações do ChronoCord">
        <SettingsSidebar user={user} profile={profile} route={route} onRouteChange={navigate} query={query} onQueryChange={setQuery} onProfileEdit={() => navigate('profile.edit')} onLogout={onLogout} />
        <main className="cc-settings-main">
          <div className="cc-settings-topbar"><div><strong>{routeTitle(route)}</strong><span>ChronoCord</span></div><button type="button" className="cc-settings-close" aria-label="Fechar configurações" onClick={close}>×</button></div>
          <div className="cc-settings-scroll" ref={scrollRef}><div className="cc-settings-content">{page}</div></div>
        </main>
      </div>
    </div>
  );
}

function renderPage(route, props) {
  switch (routeGroup(route)) {
    case 'account': return <AccountSettings {...props} />;
    case 'privacy': return <PrivacySettings {...props} />;
    case 'messaging': return <MessagePermissionsSettings {...props} />;
    case 'notifications': return <NotificationSettings {...props} />;
    case 'voice': return <VoiceVideoSettings {...props} />;
    case 'appearance': return <AppearanceSettings {...props} />;
    case 'accessibility': return <AccessibilitySettings {...props} />;
    case 'system': return <SystemSettings {...props} />;
    case 'profile': return <ProfileEditSettings {...props} />;
    case 'developer': return <DeveloperSettings {...props} />;
    default: return <MiscSettings route={route} {...props} />;
  }
}
