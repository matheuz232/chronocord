import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.join(process.cwd(), 'src', 'ChronoCord.jsx');
let source = fs.readFileSync(sourcePath, 'utf8');
let changed = 0;

function replaceOnce(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Patch não encontrado: ${label}`);
  source = source.replace(from, to);
  changed += 1;
}

replaceOnce(
  'import ProfilePage from "./ProfilePage";\n',
  'import ProfilePage from "./ProfilePage";\nimport SettingsPage from "./SettingsPage";\n',
  'SettingsPage import'
);

const anchor = '      {/* MODAL: CONVIDAR */}';
const block = `      {settingsOpen && (\n        <SettingsPage\n          T={T}\n          themeColor={themeColor}\n          themeMode={themeMode}\n          setThemeMode={setThemeMode}\n          setThemeColor={setThemeColor}\n          setHexDraft={setHexDraft}\n          authUser={authUser}\n          myAvatarUrl={myAvatarUrl}\n          formUsername={formUsername}\n          privacy={privacy}\n          setPrivacy={setPrivacy}\n          permissions={permissions}\n          setPermissions={setPermissions}\n          sounds={sounds}\n          setSounds={setSounds}\n          cameraDevice={cameraDevice}\n          setCameraDevice={setCameraDevice}\n          streamQuality={streamQuality}\n          setStreamQuality={setStreamQuality}\n          streamAudio={streamAudio}\n          setStreamAudio={setStreamAudio}\n          accessibility={accessibility}\n          setAccessibility={setAccessibility}\n          systemPrefs={systemPrefs}\n          setSystemPrefs={setSystemPrefs}\n          language={language}\n          setLanguage={setLanguage}\n          timeFormat={timeFormat}\n          setTimeFormat={setTimeFormat}\n          customStatus={customStatus}\n          setCustomStatus={setCustomStatus}\n          aboutMe={aboutMe}\n          setAboutMe={setAboutMe}\n          onClose={() => setSettingsOpen(false)}\n          onEditProfile={() => { setSettingsTab("perfil"); setProfilePage(authUser ? { ...authUser, isMe: true, name: authUser.username || formUsername || "Chronista", color: themeColor, status: "online", role: "Chronista", imgSrc: myAvatarUrl } : { isMe: true, name: formUsername || "Chronista", color: themeColor, status: "online", role: "Chronista", imgSrc: myAvatarUrl }); }}\n        />\n      )}\n\n${anchor}`;
replaceOnce(anchor, block, 'Settings page overlay');

fs.writeFileSync(sourcePath, source, 'utf8');
console.log(`ChronoCord settings page patches: ${changed} applied.`);
