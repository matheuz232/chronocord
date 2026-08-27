import React from 'react';
import { ActionButton, InlineField, SettingCard, SettingRow, SettingSection, SettingSelect } from '../components/SettingControls.jsx';

function readFile(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => callback?.(event.target.result);
  reader.readAsDataURL(file);
}

export default function ProfileEditSettings({ profile, legacy, themeColor }) {
  const name = legacy?.myName || profile?.name || '';
  const banner = legacy?.myBannerUrl || profile?.banner || '';
  const avatar = legacy?.myAvatarUrl || profile?.avatar || profile?.imgSrc || '';
  const about = legacy?.aboutMe || profile?.about || '';
  const status = legacy?.customStatus || '';
  const nameStyle = legacy?.nameStyle || { effect: 'solid', color: themeColor };

  const save = () => legacy?.saveProfilePatch?.({
    username: legacy?.myName,
    avatar: legacy?.myAvatarUrl,
    banner: legacy?.myBannerUrl,
    aboutMe: legacy?.aboutMe,
    nameStyle: legacy?.nameStyle,
    status: legacy?.myStatus,
  });

  return (
    <SettingSection route="profile.edit" title="Editar perfil" description="Banner, avatar e identidade se adaptam ao card resumido e ao perfil completo.">
      <div className="cc-profile-edit-banner" style={{ backgroundImage: banner ? `url(${banner})` : undefined }}>
        <div className="cc-profile-edit-avatar">{avatar ? <img src={avatar} alt="" /> : String(name || 'CC').slice(0, 2).toUpperCase()}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <label className="cc-settings-button is-primary" style={{ cursor: 'pointer' }}>Trocar banner<input type="file" accept="image/png,image/gif,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(event) => readFile(event.target.files?.[0], legacy?.setMyBannerUrl)} /></label>
        <label className="cc-settings-button" style={{ cursor: 'pointer' }}>Trocar avatar<input type="file" accept="image/png,image/gif,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(event) => readFile(event.target.files?.[0], legacy?.setMyAvatarUrl)} /></label>
        {(banner || avatar) && <ActionButton tone="ghost" onClick={() => { legacy?.setMyBannerUrl?.(null); legacy?.setMyAvatarUrl?.(null); }}>Remover imagens</ActionButton>}
      </div>

      <InlineField label="Nome de exibição" value={name} onChange={(value) => legacy?.setMyName?.(value || 'Você')} maxLength={32} />
      <label className="cc-inline-field"><span>Sobre mim</span><textarea value={about} onChange={(event) => legacy?.setAboutMe?.(event.target.value.slice(0, 500))} rows={4} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--cc-bg-1)', color: 'var(--cc-text-main)', border: '1px solid var(--cc-border)', borderRadius: 8, padding: 10, resize: 'vertical' }} /></label>
      <InlineField label="Status personalizado" value={status} onChange={(value) => legacy?.setCustomStatus?.(value.slice(0, 128))} placeholder="Qual emoji descreve seu dia? 🌙" />

      <SettingCard title="Estilo do nome exibido" description="O mesmo estilo é reutilizado no perfil resumido e completo.">
        <SettingRow label="Efeito"><SettingSelect value={nameStyle.effect || 'solid'} onChange={(value) => legacy?.setNameStyle?.((old) => ({ ...(old || {}), effect: value }))} options={['solid','gradient','neon','desenho','pop','gummy','prism','aurora','holographic','glitch','pixel','chrome','velvet','fire','ice','cosmic']} ariaLabel="Efeito do nome" /></SettingRow>
        <SettingRow label="Cor"><input type="color" value={nameStyle.color || themeColor} onChange={(event) => legacy?.setNameStyle?.((old) => ({ ...(old || {}), color: event.target.value }))} style={{ width: 48, height: 36, border: 0, background: 'transparent' }} aria-label="Cor do nome" /></SettingRow>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 20, color: nameStyle.color || themeColor, textShadow: nameStyle.effect === 'neon' ? `0 0 14px ${nameStyle.color || themeColor}` : 'none' }}>{name || 'Seu nome'} ✨</div>
      </SettingCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><ActionButton tone="primary" onClick={save}>Salvar perfil</ActionButton></div>
    </SettingSection>
  );
}
