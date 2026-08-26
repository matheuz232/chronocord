import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'ProfilePage.jsx');

if (!fs.existsSync(file)) {
  throw new Error(`ProfilePage não encontrado: ${file}`);
}

const source = fs.readFileSync(file, 'utf8');
let next = source;
const changes = [];

function replaceOnce(from, to, label) {
  if (next.includes(to)) return false;
  if (!next.includes(from)) return false;
  next = next.replace(from, to);
  changes.push(label);
  return true;
}

// The media UI can already be integrated in the source. In that case this
// patcher becomes intentionally idempotent instead of trying to rewrite JSX.
const hasSeparatedMediaUi =
  next.includes('Alterar foto') &&
  next.includes('Alterar banner') &&
  next.includes('bannerImage') &&
  next.includes('avatarSrc');

if (!hasSeparatedMediaUi) {
  replaceOnce(
    '  bannerColor: "#090909",\n',
    '  bannerColor: "#090909",\n  bannerImage: "",\n  avatarSrc: "",\n',
    'custom media defaults'
  );

  replaceOnce(
    '  const img = profile?.imgSrc;\n',
    '  const img = custom.avatarSrc || profile?.imgSrc;\n',
    'avatar preview source'
  );

  replaceOnce(
    'background: `linear-gradient(135deg, ${custom.bannerColor}, ${T.bg3})`,',
    'background: `linear-gradient(135deg, ${custom.bannerColor}, ${T.bg3})`,\n      backgroundImage: custom.bannerImage ? `url(${custom.bannerImage})` : undefined,\n      backgroundSize: "cover",\n      backgroundPosition: "center",',
    'banner image rendering'
  );
}

if (next !== source) {
  fs.writeFileSync(file, next, 'utf8');
}

console.log(
  changes.length > 0
    ? `Profile media fix: ${changes.join(', ')}`
    : 'Profile media fix: already integrated or no safe migration needed.'
);
