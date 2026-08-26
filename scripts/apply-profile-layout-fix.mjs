import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'ProfilePage.jsx');
let s = fs.readFileSync(file, 'utf8');
if (s.includes('cc-profile-banner-avatar')) process.exit(0);

const old = 'style={{ position: "absolute", left: 0, right: 0, bottom: -76, padding: "0 34px", display: "flex", alignItems: "flex-end", gap: 18 }}';
const next = 'className="cc-profile-banner-content" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 34px 24px 192px", display: "flex", alignItems: "flex-end", gap: 18, zIndex: 2 }}';
s = s.replace(old, next);

const oldBanner = 'style={{ minHeight: 260, background:';
const newBanner = 'className="cc-profile-banner" style={{ minHeight: 300, overflow: "visible", borderRadius: "0 0 18px 18px", background:';
s = s.replace(oldBanner, newBanner);

const oldAvatar = '<AvatarPreview profile={profile} custom={custom} T={T} themeColor={themeColor} size={112} />';
const newAvatar = '<div className="cc-profile-banner-avatar"><AvatarPreview profile={profile} custom={custom} T={T} themeColor={themeColor} size={112} /></div>';
s = s.replace(oldAvatar, newAvatar);

const oldPadding = 'style={{ padding: "92px 34px 40px", maxWidth: 1100, margin: "0 auto" }}';
const newPadding = 'style={{ padding: "100px 34px 40px", maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}';
s = s.replace(oldPadding, newPadding);

const marker = '<style>{`';
const css = `.cc-profile-banner{box-shadow:0 18px 50px rgba(0,0,0,.24)} .cc-profile-banner-avatar{position:absolute;left:34px;bottom:-64px;width:140px;height:140px;display:flex;align-items:center;justify-content:center;z-index:4}.cc-profile-banner-content{min-height:84px}.cc-profile-banner-avatar img{position:relative;z-index:5}@media(max-width:760px){.cc-profile-banner-avatar{left:18px;bottom:-56px;transform:scale(.88);transform-origin:left bottom}.cc-profile-banner-content{padding-left:150px!important;padding-right:18px!important;padding-bottom:18px!important}.cc-profile-banner-content{min-height:74px}}`;
if (s.includes(marker) && !s.includes('.cc-profile-banner-avatar{')) {
  s = s.replace(marker, `${marker}\n        ${css}\n`);
}
fs.writeFileSync(file, s, 'utf8');
