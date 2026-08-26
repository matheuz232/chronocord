const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile, spawn } = require('node:child_process');
const https = require('node:https');
const { URL } = require('node:url');

const MANIFEST_URL = '__MANIFEST_URL__';
const RELEASE_REPO = 'matheuz232/chronocord';
let args = Object.fromEntries(process.argv.slice(1).filter(x=>x.startsWith('--')).map(x=>{const [k,...v]=x.slice(2).split('=');return [k,v.join('=')||true]}));
const currentVersion = String(args.current || '0.0.0');
const appPid = Number(args.pid || 0);
let win;

function requestGithubLatestRelease(repo){
  return new Promise((resolve,reject)=>{
    const u=new URL(`https://api.github.com/repos/${repo}/releases/latest`);
    const req=https.get(u,{headers:{'User-Agent':'ChronoCord-Updater/1.0','Accept':'application/vnd.github+json','Cache-Control':'no-cache'}},res=>{let data='';res.setEncoding('utf8');res.on('data',d=>data+=d);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error(`GitHub HTTP ${res.statusCode}`));try{resolve(JSON.parse(data))}catch{reject(new Error('Resposta do GitHub inválida.'))}})});req.setTimeout(15000,()=>req.destroy(new Error('Tempo esgotado.')));req.on('error',reject)})
}
async function resolveLatest(){
  if(RELEASE_REPO && RELEASE_REPO!=='__RELEASE_REPO__'){
    const rel=await requestGithubLatestRelease(RELEASE_REPO);
    const exe=rel.assets?.find(a=>/^ChronoCord-Setup-.*\.exe$/i.test(a.name));
    const sha=rel.assets?.find(a=>/^ChronoCord-Setup-.*\.sha256$/i.test(a.name));
    if(!exe||!sha) throw new Error('A release mais recente não contém o instalador e o checksum esperados.');
    const checksumText=await new Promise((resolve,reject)=>{https.get(sha.browser_download_url,{headers:{'User-Agent':'ChronoCord-Updater/1.0'}},r=>{let d='';r.setEncoding('utf8');r.on('data',x=>d+=x);r.on('end',()=>r.statusCode===200?resolve(d.trim()):reject(new Error(`Checksum HTTP ${r.statusCode}`)))}).on('error',reject)});
    const checksum=(checksumText.match(/[a-f0-9]{64}/i)||[])[0];
    if(!checksum) throw new Error('Checksum SHA-256 inválido na release.');
    return {product:'ChronoCord',version:rel.tag_name.replace(/^chronocord-v/i,'').replace(/^v/i,''),title:rel.name||rel.tag_name,notes:rel.body||'',mandatory:false,size:exe.size||0,url:exe.browser_download_url,sha256:checksum};
  }
  return requestJson(MANIFEST_URL);
}

function cmp(a,b){const pa=String(a).replace(/^v/i,'').split('-')[0].split('.').map(Number);const pb=String(b).replace(/^v/i,'').split('-')[0].split('.').map(Number);for(let i=0;i<3;i++){if((pa[i]||0)!==(pb[i]||0))return (pa[i]||0)-(pb[i]||0)}return 0}
function requestJson(url){return new Promise((resolve,reject)=>{const u=new URL(url);const req=https.get(u,{headers:{'User-Agent':'ChronoCord-Updater/1.0','Accept':'application/json','Cache-Control':'no-cache'}},res=>{let data='';res.setEncoding('utf8');res.on('data',d=>data+=d);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error(`HTTP ${res.statusCode}`));try{resolve(JSON.parse(data))}catch{reject(new Error('Manifesto inválido.'))}})});req.setTimeout(15000,()=>req.destroy(new Error('Tempo esgotado.')));req.on('error',reject)})}
function download(url,dest,onProgress){return new Promise((resolve,reject)=>{const u=new URL(url);const file=fs.createWriteStream(dest);const req=https.get(u,{headers:{'User-Agent':'ChronoCord-Updater/1.0'}},res=>{if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){file.close();fs.rmSync(dest,{force:true});return download(new URL(res.headers.location,u).href,dest,onProgress).then(resolve,reject)}if(res.statusCode!==200){file.close();fs.rmSync(dest,{force:true});return reject(new Error(`Download HTTP ${res.statusCode}`))}const total=Number(res.headers['content-length']||0);let done=0;res.on('data',chunk=>{done+=chunk.length;onProgress?.(total?Math.round(done/total*100):0)});res.pipe(file);file.on('finish',()=>file.close(resolve));});req.setTimeout(120000,()=>req.destroy(new Error('Download expirou.')));req.on('error',e=>{file.close();fs.rmSync(dest,{force:true});reject(e)})})}
function sha256(file){return new Promise((resolve,reject)=>{const h=crypto.createHash('sha256');const s=fs.createReadStream(file);s.on('data',d=>h.update(d));s.on('end',()=>resolve(h.digest('hex')));s.on('error',reject)})}
function waitPid(pid){return new Promise(resolve=>{if(!pid||pid===process.pid)return resolve();const started=Date.now();const check=()=>{try{process.kill(pid,0);if(Date.now()-started>20000)return resolve();setTimeout(check,250)}catch{resolve()}};check()})}
function createWindow(){win=new BrowserWindow({width:520,height:650,resizable:false,show:false,backgroundColor:'#090812',autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.cjs')}});win.loadFile(path.join(__dirname,'ui.html'));win.once('ready-to-show',()=>win.show())}
function send(type,data){if(win&&!win.isDestroyed())win.webContents.send('updater:event',{type,...data})}
async function performUpdate(manifest){
  const dest=path.join(app.getPath('temp'),`ChronoCord-Setup-${manifest.version}.exe`);
  send('state',{step:'download',progress:0,text:'Baixando o instalador…'});
  await download(manifest.url,dest,p=>send('state',{step:'download',progress:p,text:`Baixando o instalador… ${p}%`}));
  send('state',{step:'verify',progress:100,text:'Verificando integridade…'});
  const actual=await sha256(dest); if(actual.toLowerCase()!==String(manifest.sha256||'').toLowerCase()){fs.rmSync(dest,{force:true});throw new Error('A verificação de integridade falhou. O instalador foi descartado.')}
  send('state',{step:'close',progress:100,text:'Fechando o ChronoCord…'});
  if (appPid && process.platform === 'win32') { await new Promise((resolve,reject)=>execFile('taskkill',['/PID',String(appPid),'/T'],{windowsHide:true},()=>resolve())); }
  await waitPid(appPid);
  send('state',{step:'install',progress:100,text:'Instalando a nova versão…'});
  const child=spawn(dest,['--updated'],{detached:true,stdio:'ignore',windowsHide:false}); child.unref();
  send('state',{step:'done',progress:100,text:'Atualização iniciada. O ChronoCord será aberto novamente.'});
  setTimeout(()=>app.quit(),1200);
}
ipcMain.handle('update-now',async()=>{try{const m=await resolveLatest();await performUpdate(m);return {ok:true}}catch(e){send('error',{text:e.message||'Não foi possível atualizar.'});return {ok:false,error:e.message}}});
ipcMain.handle('later',()=>{app.quit();return true});
app.whenReady().then(async()=>{createWindow();try{const m=await resolveLatest();if(!m||m.product!=='ChronoCord'||!m.version||!m.url||!m.sha256)throw new Error('Atualização inválida.');if(cmp(m.version,currentVersion)<=0){app.quit();return}win.webContents.once('did-finish-load',()=>send('available',{version:m.version,title:m.title||`ChronoCord ${m.version}`,notes:m.notes||'',mandatory:!!m.mandatory,size:m.size||0}));}catch(e){app.quit()}});
app.on('window-all-closed',()=>app.quit());
