'use strict';

// ChronoCord Platform Server 1.0.0
// Long-lived compatibility layer around the mature 0.5.0 core.
const fs = require('fs');
const path = require('path');
const legacyPath = path.join(__dirname, 'server.legacy.js');

// This file is intentionally small: it loads the battle-tested core after
// preparing compatibility metadata. The core itself remains backwards-compatible.
const protocol = JSON.parse(fs.readFileSync(path.join(__dirname, 'protocol.json'), 'utf8'));
const DB_PATH = path.join(__dirname, 'data.json');

function ensureMetadata() {
  if (!fs.existsSync(DB_PATH)) return;
  try {
    const backupDir = path.join(__dirname, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `data-${stamp}.json`);
    fs.copyFileSync(DB_PATH, backupPath);
    const backups = fs.readdirSync(backupDir).filter(x => x.endsWith('.json')).sort();
    for (const old of backups.slice(0, Math.max(0, backups.length - 5))) fs.rmSync(path.join(backupDir, old), { force: true });
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!db.__chronocord) {
      db.__chronocord = { schema: 2, platformVersion: protocol.platformVersion, migratedAt: new Date().toISOString() };
      const tmp = `${DB_PATH}.platform.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(db), 'utf8');
      fs.renameSync(tmp, DB_PATH);
    }
  } catch (e) {
    console.error('[platform] metadata migration deferred:', e.message);
  }
}

ensureMetadata();

// Export protocol information for the legacy core to discover through env.
process.env.CC_PLATFORM_VERSION = protocol.platformVersion;
process.env.CC_PROTOCOL_VERSION = String(protocol.protocolVersion);
process.env.CC_FEATURES = JSON.stringify(protocol.features);

require(legacyPath);
