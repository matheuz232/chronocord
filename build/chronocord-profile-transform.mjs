export function chronocordProfileSummary() {
  return {
    name: 'chronocord-profile-summary',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/ChronoCord.jsx') && !id.endsWith('\\src\\ChronoCord.jsx')) return null;

      let output = code.replace(/\r\n/g, '\n');
      let changed = output !== code;

      const importMarker = "import ProfileSummaryCard from './profile/ProfileSummaryCard.jsx';";
      if (!output.includes(importMarker)) {
        output = `${importMarker}\n${output}`;
        changed = true;
      }

      const startMarker = '      {/* MODAL: PERFIL */}\n      {profileModal && (';
      const endMarker = '\n\n      {/* MODAL: CRIAR / ENTRAR EM ERA */}';
      const start = output.indexOf(startMarker);
      const end = output.indexOf(endMarker, start + startMarker.length);
      if (start < 0 || end < 0) {
        throw new Error('ChronoCord profile modal markers were not found; refusing to build an unpatched profile summary.');
      }

      const replacement = `      {/* MODAL: PERFIL */}\n      {profileModal && (\n        <Modal onClose={() => setProfileModal(null)} width={390} bg={T.bg2} border={T.border}>\n          <ProfileSummaryCard\n            profile={{\n              ...profileModal,\n              avatar: profileModal.isMe ? myAvatarUrl : profileModal.imgSrc,\n              imgSrc: profileModal.isMe ? myAvatarUrl : profileModal.imgSrc,\n              banner: profileModal.isMe ? (myBannerUrl || myBanner?.src || null) : profileModal.banner,\n              about: profileModal.isMe ? aboutMe : (profileModal.about || null),\n              customStatus: profileModal.isMe ? customStatus : (profileModal.customStatus || null),\n            }}\n            isMe={!!profileModal.isMe}\n            T={T}\n            themeColor={themeColor}\n            onClose={() => setProfileModal(null)}\n            onOpenFullProfile={() => {\n              const p = profileModal;\n              setProfileModal(null);\n              setFullProfilePage({\n                ...p,\n                about: p.isMe ? aboutMe : (p.about || ''),\n                banner: p.isMe ? (myBannerUrl || myBanner?.src || null) : p.banner,\n                imgSrc: p.isMe ? myAvatarUrl : p.imgSrc,\n              });\n            }}\n            onEditProfile={() => { setProfileModal(null); setSettingsOpen(true); setSettingsTab('perfil'); }}\n          />\n        </Modal>\n      )}`;

      output = output.slice(0, start) + replacement + output.slice(end);
      changed = true;

      if (!output.includes('<ProfileSummaryCard') || !output.includes('onOpenFullProfile=') || !output.includes('onEditProfile=')) {
        throw new Error('ChronoCord profile summary integration markers are missing.');
      }

      return changed ? { code: output, map: null } : null;
    },
  };
}
