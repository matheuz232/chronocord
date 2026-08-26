import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'ChronoCord.jsx');
let source = fs.readFileSync(file, 'utf8');
const from = 'src="/chronocord-logo.svg"';
const to = 'src="/assets/chronocord-wordmark.svg"';
if (source.includes(from)) {
  source = source.replaceAll(from, to);
  fs.writeFileSync(file, source, 'utf8');
  console.log('Existing login switched to the new transparent wordmark.');
} else {
  console.log('Login branding already uses the new wordmark.');
}
