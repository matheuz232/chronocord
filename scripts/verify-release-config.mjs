import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'release-config.json'), 'utf8'));
if (cfg.githubOwner !== 'matheuz232' || cfg.githubRepo !== 'chronocord') {
  throw new Error(`Updater deve apontar para matheuz232/chronocord, mas está em ${cfg.githubOwner || '(vazio)'}/${cfg.githubRepo || '(vazio)'}.`);
}
if (!/^[A-Za-z0-9_.-]+$/.test(String(cfg.manifestPath || ''))) {
  throw new Error('manifestPath inválido.');
}
if (cfg.githubRepo === 'chronocord-server') {
  throw new Error('Configuração insegura: o updater não pode publicar releases do servidor.');
}
console.log(`Release config OK — ${cfg.githubOwner}/${cfg.githubRepo} (${cfg.manifestPath}).`);
