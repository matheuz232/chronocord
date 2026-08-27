import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chronocordSettingsCenter } from '../build/chronocord-settings-transform.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const id = 'C:/repo/src/ChronoCord.jsx';
const source = `import React from 'react';
function App(){
  const settingsOpen=true, authUser={id:'u'}, settingsTab='conta', T={}, themeColor='#fff';
  const setSettingsOpen=()=>{}, logout=()=>{};
  const myName='',setMyName=()=>{},myStatus='',setMyStatus=()=>{},myAvatarUrl='',setMyAvatarUrl=()=>{},myBannerUrl='',setMyBannerUrl=()=>{},aboutMe='',setAboutMe=()=>{},nameStyle={},setNameStyle=()=>{},customStatus='',setCustomStatus=()=>{},saveProfilePatch=()=>{};
  const voiceIn='',setVoiceIn=()=>{},voiceOut='',setVoiceOut=()=>{},inputVol=1,setInputVol=()=>{},outputVol=1,setOutputVol=()=>{},cameraDevice='',setCameraDevice=()=>{},cameraBg='',setCameraBg=()=>{},streamQuality='',setStreamQuality=()=>{},streamAudio=true,setStreamAudio=()=>{},sounds={},setSounds=()=>{},soundboardVolume=1,setSoundboardVolume=()=>{},playSound=()=>{},playingSound='',advanced={},setAdvanced=()=>{},systemPrefs={},setSystemPrefs=()=>{},language='',setLanguage=()=>{},timeFormat='',setTimeFormat=()=>{},themeMode='',setThemeMode=()=>{},setThemeColor=()=>{},hexDraft='',setHexDraft=()=>{},setHexError=()=>{},tintStrength=0,setTintStrength=()=>{};
  return <div>
      {/* MODAL: CONFIGURAÇÕES */}
      {settingsOpen && (<div>legacy settings</div>)}

      {/* MODAL: CONVIDAR */}
      <div>invite</div>
  </div>;
}`;

test('settings transform imports and mounts SettingsCenter while preserving following modal', () => {
  const plugin = chronocordSettingsCenter();
  const result = plugin.transform(source, id);
  assert.ok(result?.code.includes("import SettingsCenter from './settings/SettingsCenter.jsx';"));
  assert.ok(result.code.includes('<SettingsCenter'));
  assert.ok(result.code.includes('legacy={{'));
  assert.ok(result.code.includes('{/* MODAL: CONVIDAR */}'));
  assert.equal(result.code.includes('legacy settings'), false);
});

test('settings center keeps both columns independently scrollable with visible Chromium scrollbars', () => {
  const centerPath = resolve(root, 'src/settings/SettingsCenter.jsx');
  const scrollbarPath = resolve(root, 'src/settings/settings-scrollbars.css');
  const centerSource = readFileSync(centerPath, 'utf8');
  const scrollbarSource = existsSync(scrollbarPath) ? readFileSync(scrollbarPath, 'utf8') : '';
  assert.match(centerSource, /import ['"]\.\/settings-scrollbars\.css['"]/);
  assert.ok(scrollbarSource, 'settings-scrollbars.css is missing');
  assert.match(scrollbarSource, /\.cc-settings-sidebar\s*\{[^}]*min-height\s*:\s*0[^}]*height\s*:\s*100%[^}]*overflow-y\s*:\s*scroll/s);
  assert.match(scrollbarSource, /\.cc-settings-scroll\s*\{[^}]*min-height\s*:\s*0[^}]*overflow-y\s*:\s*scroll/s);
  assert.match(scrollbarSource, /::-webkit-scrollbar/);
  assert.match(scrollbarSource, /::-webkit-scrollbar-thumb/);
});

test('settings transform refuses to silently build if modal markers disappear', () => {
  const plugin = chronocordSettingsCenter();
  assert.throws(() => plugin.transform('function App(){}', id), /settings modal markers/i);
});
