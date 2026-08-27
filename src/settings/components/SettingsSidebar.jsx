import React, { useMemo } from 'react';
import { SETTINGS_GROUPS, filterSettingsRoutes } from '../settingsCatalog.js';

function sectionOrder(groups) {
  return [...new Set(groups.map((group) => group.section))];
}

export default function SettingsSidebar({ user, profile, route, onRouteChange, query, onQueryChange, onProfileEdit, onLogout }) {
  const filtered = useMemo(() => filterSettingsRoutes(query), [query]);
  const matchedIds = useMemo(() => new Set(filtered.map((item) => item.id)), [filtered]);
  const activeGroupId = route?.includes('.') ? route.split('.')[0] : route;
  const sections = sectionOrder(SETTINGS_GROUPS);

  return (
    <aside className="cc-settings-sidebar">
      <button type="button" className="cc-settings-profile" onClick={onProfileEdit} style={{ width: '100%', border: 0, color: 'inherit', textAlign: 'left' }}>
        <span className="cc-settings-profile-avatar">
          {profile?.avatar || profile?.imgSrc ? <img src={profile.avatar || profile.imgSrc} alt="" /> : String(profile?.name || user?.username || 'CC').slice(0, 2).toUpperCase()}
        </span>
        <span className="cc-settings-profile-copy">
          <strong>{profile?.name || user?.username || 'Chronista'}</strong>
          <span>Editar perfil ✎</span>
        </span>
      </button>

      <div className="cc-settings-search">
        <span>⌕</span>
        <input value={query} onChange={(event) => onQueryChange?.(event.target.value)} placeholder="Buscar" aria-label="Buscar configurações" />
      </div>

      {sections.map((section) => {
        const groups = SETTINGS_GROUPS.filter((group) => group.section === section).filter((group) => {
          if (!query) return true;
          if (!group.children?.length) return matchedIds.has(group.id);
          return group.children.some((child) => matchedIds.has(child.id));
        });
        if (!groups.length) return null;
        return (
          <div key={section}>
            <div className="cc-settings-nav-section">{section}</div>
            {groups.map((group) => {
              const hasChildren = !!group.children?.length;
              const active = activeGroupId === group.id;
              const visibleChildren = hasChildren && (active || !!query);
              const firstRoute = hasChildren ? group.children[0].id : group.id;
              return (
                <div className="cc-settings-nav-group" key={group.id}>
                  <button type="button" className={`cc-settings-nav-main${active ? ' is-active' : ''}`} onClick={() => onRouteChange?.(firstRoute)}>
                    <span className="cc-settings-nav-icon">{iconFor(group.icon)}</span>
                    <span>{group.label}</span>
                  </button>
                  {visibleChildren && (
                    <div className="cc-settings-nav-children">
                      {group.children.filter((item) => !query || matchedIds.has(item.id)).map((item) => (
                        <button key={item.id} type="button" className={`cc-settings-nav-child${route === item.id ? ' is-active' : ''}`} onClick={() => onRouteChange?.(item.id)}>{item.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="cc-settings-nav-section">Sessão</div>
      <button type="button" className="cc-settings-logout" onClick={onLogout}>↪ Sair</button>
    </aside>
  );
}

function iconFor(name) {
  return ({
    user: '●', shield: '⬟', message: '◆', bell: '●', mic: '♬', palette: '◐', accessibility: '◎', system: '▦', language: '文', game: '♟', activity: '◌', overlay: '▣', link: '↗', code: '<>',
  })[name] || '•';
}
