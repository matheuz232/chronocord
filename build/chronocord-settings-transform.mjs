export function chronocordSettingsCenter() {
  return {
    name: 'chronocord-settings-center',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/ChronoCord.jsx') && !id.endsWith('\\src\\ChronoCord.jsx')) return null;

      let output = code.replace(/\r\n/g, '\n');
      const importLine = "import SettingsCenter from './settings/SettingsCenter.jsx';";
      if (!output.includes(importLine)) output = `${importLine}\n${output}`;

      const startMarker = '      {/* MODAL: CONFIGURAÇÕES */}\n';
      const endMarker = '      {/* MODAL: CONVIDAR */}\n';
      const start = output.indexOf(startMarker);
      const end = output.indexOf(endMarker, start + startMarker.length);
      if (start < 0 || end < 0 || end <= start) {
        throw new Error('ChronoCord settings modal markers were not found; refusing to build an unintegrated Settings Center.');
      }

      const replacement = `      {/* MODAL: CONFIGURAÇÕES */}\n      {settingsOpen && (\n        <SettingsCenter\n          user={authUser}\n          profile={{\n            id: authUser?.id,\n            name: myName,\n            username: authUser?.username,\n            avatar: myAvatarUrl,\n            imgSrc: myAvatarUrl,\n            banner: myBannerUrl,\n            about: aboutMe,\n            status: myStatus,\n          }}\n          T={T}\n          themeColor={themeColor}\n          onClose={() => setSettingsOpen(false)}\n          onLogout={() => { setSettingsOpen(false); logout(); }}\n          legacy={{\n            settingsTab,\n            myName, setMyName,\n            myStatus, setMyStatus,\n            myAvatarUrl, setMyAvatarUrl,\n            myBannerUrl, setMyBannerUrl,\n            aboutMe, setAboutMe,\n            nameStyle, setNameStyle,\n            customStatus, setCustomStatus,\n            saveProfilePatch,\n            voiceIn, setVoiceIn,\n            voiceOut, setVoiceOut,\n            inputVol, setInputVol,\n            outputVol, setOutputVol,\n            cameraDevice, setCameraDevice,\n            cameraBg, setCameraBg,\n            streamQuality, setStreamQuality,\n            streamAudio, setStreamAudio,\n            sounds, setSounds,\n            soundboardVolume, setSoundboardVolume,\n            playSound, playingSound,\n            advanced, setAdvanced,\n            systemPrefs, setSystemPrefs,\n            language, setLanguage,\n            timeFormat, setTimeFormat,\n            themeMode, setThemeMode,\n            themeColor, setThemeColor,\n            hexDraft, setHexDraft, setHexError,\n            tintStrength, setTintStrength,\n          }}\n        />\n      )}\n\n`;

      output = output.slice(0, start) + replacement + output.slice(end);
      if (!output.includes('<SettingsCenter') || output.includes('createAccountApi') || output.includes('accountApi=') || output.includes('legacy settings')) {
        throw new Error('ChronoCord Settings Center integration failed validation.');
      }
      return { code: output, map: null };
    },
  };
}
