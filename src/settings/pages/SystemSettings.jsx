import React, { useMemo, useState } from 'react';
import { DEFAULT_SHORTCUTS, hasShortcutConflict } from '../settingsCatalog.js';
import { ActionButton, InlineField, SettingCard, SettingRow, SettingSection, SettingToggle, SettingsNotice, ShortcutChip } from '../components/SettingControls.jsx';

function parseKeys(value) {
  return String(value || '').split('+').map((key) => key.trim().toUpperCase()).filter(Boolean);
}

export default function SystemSettings({ settings, patch, legacy }) {
  const [shortcutLabel, setShortcutLabel] = useState('');
  const [shortcutKeys, setShortcutKeys] = useState('');
  const [shortcutError, setShortcutError] = useState('');
  const custom = settings.system.customShortcuts || [];
  const groupedShortcuts = useMemo(() => {
    const groups = new Map();
    for (const shortcut of DEFAULT_SHORTCUTS) {
      if (!groups.has(shortcut.section)) groups.set(shortcut.section, []);
      groups.get(shortcut.section).push(shortcut);
    }
    return [...groups.entries()];
  }, []);

  const setSystem = (path, value) => {
    patch(`system.${path}`, value);
    if (path === 'openOnStartup') legacy?.setSystemPrefs?.((old) => ({ ...old, openOnStartup: value }));
    if (path === 'startMinimized') legacy?.setSystemPrefs?.((old) => ({ ...old, startMinimized: value }));
    if (path === 'minimizeToTray') legacy?.setSystemPrefs?.((old) => ({ ...old, minimizeToTray: value }));
    if (path === 'hardwareAcceleration') legacy?.setAdvanced?.((old) => ({ ...old, hardwareAccel: value }));
  };

  const addShortcut = () => {
    const keys = parseKeys(shortcutKeys);
    const label = shortcutLabel.trim();
    if (!label || !keys.length) { setShortcutError('Informe uma ação e uma combinação de teclas.'); return; }
    if (hasShortcutConflict(keys, [...DEFAULT_SHORTCUTS, ...custom])) { setShortcutError('Essa combinação já está em uso.'); return; }
    patch('system.customShortcuts', [...custom, { id: `custom-${Date.now()}`, label, keys }]);
    setShortcutLabel(''); setShortcutKeys(''); setShortcutError('');
  };

  return (
    <>
      <SettingSection route="system.general" title="Geral">
        <SettingRow label="Abrir automaticamente o ChronoCord quando o computador iniciar"><SettingToggle checked={settings.system.openOnStartup} onChange={(v) => setSystem('openOnStartup', v)} ariaLabel="Abrir com o computador" /></SettingRow>
        <SettingRow label="Iniciar o ChronoCord minimizado" description="Disponível quando a inicialização automática estiver ativada." disabled={!settings.system.openOnStartup}><SettingToggle checked={settings.system.startMinimized} disabled={!settings.system.openOnStartup} onChange={(v) => setSystem('startMinimized', v)} ariaLabel="Iniciar minimizado" /></SettingRow>
        <SettingRow label="Minimize o ChronoCord para a bandeja do sistema" description="Clicar em fechar pode manter o aplicativo em segundo plano."><SettingToggle checked={settings.system.minimizeToTray} onChange={(v) => setSystem('minimizeToTray', v)} ariaLabel="Minimizar para bandeja" /></SettingRow>
        <SettingRow label="Habilitar aceleração de hardware" description="Preferência local ligada ao estado atual do app. Reinício pode ser necessário na integração final."><SettingToggle checked={settings.system.hardwareAcceleration} onChange={(v) => setSystem('hardwareAcceleration', v)} ariaLabel="Aceleração de hardware" /></SettingRow>
      </SettingSection>

      <SettingSection route="system.customShortcuts" title="Atalhos do teclado personalizados" description="Crie combinações locais sem substituir os atalhos padrão.">
        <SettingCard>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <InlineField label="Ação" value={shortcutLabel} onChange={setShortcutLabel} placeholder="Ex.: Abrir Jukebox" />
            <InlineField label="Teclas" value={shortcutKeys} onChange={setShortcutKeys} placeholder="CTRL + SHIFT + J" />
            <ActionButton tone="primary" onClick={addShortcut}>＋ Adicionar atalho</ActionButton>
          </div>
          {shortcutError && <SettingsNotice tone="danger">{shortcutError}</SettingsNotice>}
          <SettingsNotice>Os atalhos ficam desativados enquanto esta tela estiver visível.</SettingsNotice>
        </SettingCard>
        {custom.length ? <div className="cc-shortcut-table">{custom.map((shortcut) => <div className="cc-shortcut-row" key={shortcut.id}><span>{shortcut.label}</span><div className="cc-shortcut-keys">{shortcut.keys.map((key) => <ShortcutChip key={key}>{key}</ShortcutChip>)}</div><ActionButton tone="ghost" onClick={() => patch('system.customShortcuts', custom.filter((item) => item.id !== shortcut.id))}>Remover</ActionButton></div>)}</div> : <div style={{ color: 'var(--cc-text-faint)', fontSize: 11 }}>Você ainda não adicionou nenhum atalho personalizado.</div>}
        {!!custom.length && <div style={{ marginTop: 10 }}><ActionButton tone="danger" onClick={() => patch('system.customShortcuts', [])}>Restaurar personalizados</ActionButton></div>}
      </SettingSection>

      <SettingSection route="system.defaultShortcuts" title="Atalhos padrão">
        {groupedShortcuts.map(([section, shortcuts]) => <div key={section} style={{ marginBottom: 20 }}><h3 style={{ fontSize: 13, margin: '0 0 7px' }}>{section}</h3><div className="cc-shortcut-table">{shortcuts.map((shortcut) => <div className="cc-shortcut-row" key={shortcut.id}><span>{shortcut.label}</span><div className="cc-shortcut-keys">{shortcut.keys.map((key) => <ShortcutChip key={key}>{key}</ShortcutChip>)}</div></div>)}</div></div>)}
      </SettingSection>

      <SettingSection route="system.assistant" title="Assistente do ChronoCord">
        <SettingRow label={`Assistente do ChronoCord · ${!settings.system.assistantInstalled ? 'Não instalado' : settings.system.assistantRunning ? 'Correndo' : 'Parado'}`} description="Melhora a experiência em jogos e apps. Nesta fase o serviço é simulado localmente.">
          <div style={{ display: 'flex', gap: 7 }}>
            {!settings.system.assistantInstalled ? <ActionButton tone="primary" onClick={() => { patch('system.assistantInstalled', true); patch('system.assistantRunning', true); }}>Instalar</ActionButton> : <><ActionButton onClick={() => patch('system.assistantRunning', !settings.system.assistantRunning)}>{settings.system.assistantRunning ? 'Parar' : 'Iniciar'}</ActionButton><ActionButton tone="danger" onClick={() => { patch('system.assistantInstalled', false); patch('system.assistantRunning', false); }}>Desinstalar</ActionButton></>}
          </div>
        </SettingRow>
        <SettingsNotice>Um processo/serviço real do sistema operacional será criado somente na versão final.</SettingsNotice>
      </SettingSection>
    </>
  );
}

export function DeveloperSettings({ settings, patch }) {
  return (
    <SettingSection route="developer" title="Desenvolvedor">
      <SettingRow label="Modo desenvolvedor" description="Revela recursos de contexto úteis para pessoas criando integrações com a API do ChronoCord."><SettingToggle checked={settings.system.developerMode} onChange={(v) => patch('system.developerMode', v)} ariaLabel="Modo desenvolvedor" /></SettingRow>
      <SettingRow label="Modo de Teste de Aplicativos" description="Insira a ID do seu aplicativo ChronoCord para ativar o modo de teste."><SettingToggle checked={settings.system.appTestMode} onChange={(v) => patch('system.appTestMode', v)} ariaLabel="Modo de teste de aplicativos" /></SettingRow>
      <InlineField label="ID do aplicativo ChronoCord" value={settings.system.appTestId} onChange={(v) => patch('system.appTestId', v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80))} placeholder="app_..." disabled={!settings.system.appTestMode} />
    </SettingSection>
  );
}
