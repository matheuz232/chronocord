import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const env = { ...process.env, PORT: '31888', NODE_ENV: 'test', JWT_SECRET: 'self-test-secret-which-is-more-than-32-chars-okay' };
const child = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: root, env, stdio: ['ignore','pipe','pipe'] });
let out=''; child.stdout.on('data',d=>out+=d); child.stderr.on('data',d=>out+=d);
const get = (p) => new Promise((resolve,reject)=>{ const req=http.get(`http://127.0.0.1:31888${p}`, res=>{ let b=''; res.on('data',d=>b+=d); res.on('end',()=>resolve({status:res.statusCode,body:b})); }); req.on('error',reject); });
try {
  for(let i=0;i<50;i++){ try { const r=await get('/health'); if(r.status===200){ console.log('health: OK'); break; } } catch {} await new Promise(r=>setTimeout(r,100)); if(i===49) throw new Error('Servidor não iniciou no self-test.'); }
  const meta=await get('/api/meta');
  if(meta.status!==200) throw new Error(`meta status ${meta.status}`);
  const body=JSON.parse(meta.body);
  if(body.protocolVersion!==1) throw new Error('protocolVersion inesperada');
  console.log(`meta: OK (${body.platformVersion})`);
  const features=await get('/api/capabilities');
  if(features.status!==200) throw new Error(`capabilities status ${features.status}`);
  console.log('capabilities: OK');
  console.log('SELF-TEST OK');
  child.kill('SIGTERM');
  process.exit(0);
} catch(e){ console.error(out); console.error(e); child.kill('SIGTERM'); process.exit(1); }
