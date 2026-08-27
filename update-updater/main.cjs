const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile, spawn } = require('node:child_process');
const https = require('node:https');
const { URL } = require('node:url');

const MANIFEST_URL = '__MANIFEST_URL__';
const RELEASE_REPO = 'matheuz232/chronocord';
const args = Object.fromEntries(process.argv.slice(1).filter(x=>x.startsWith('--')).map(x=>{const [k,...v]=x.slice(2).split('=');return [k,v.join('=')||true]}));
const currentVersion = String(args.current || '0.0.0');
const appPid = Number(args.pid || 0);
const appExe = String(args['app-exe'] || '');
let win;

function requestGithubLatestRelease(repo){
  return new Promise((resolve,reject)=>{
    const u=new URL(`https://api.github.com/repos/${repo}/releases/latest`);
    const req=https.get(u,{headers:{'User-Agent':'ChronoCord-Updater/1.0','Accept':'application/vnd.github+json','Cache-Control':'no-cache'}},res=>{let data='';res.setEncoding('utf8');res.on('data',d=>data+=d);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error(`GitHub HTTP ${res.statusCode}`));try{resolve(JSON.parse(data))}catch{reject(new Error('Resposta do GitHub inválida.'))}})});req.setTimeout(15000,()=>req.destroy(new Error('Tempo esgotado.')));req.on('error',reject)})
}

function requestText(url, redirects = 0){
  if (redirects > 5) return Promise.reject(new Error('Muitos redirecionamentos ao baixar o checksum.'));
  const u = new URL(url);
  if (u.protocol !== 'https:') return Promise.reject(new Error('O checksum deve usar HTTPS.'));
  return new Promise((resolve,reject)=>{
    const req=https.get(u,{headers:{'User-Agent':'ChronoCord-Updater/1.0','Accept':'text/plain','Cache-Control':'no-cache'}},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){
        res.resume();
        return requestText(new URL(res.headers.location, u).href, redirects + 1).then(resolve,reject);
      }
      if(res.statusCode<200||res.statusCode>=300){res.resume();return reject(new Error(`Checksum HTTP ${res.statusCode}`))}
      let data='';
      let bytes=0;
      res.setEncoding('utf8');
      res.on('data',chunk=>{
        bytes+=Buffer.byteLength(chunk);
        if(bytes>1024*1024){req.destroy(new Error('Checksum inesperadamente grande.'));return}
        data+=chunk;
      });
      res.on('end',()=>resolve(data.trim()));
    });
    req.setTimeout(15000,()=>req.destroy(new Error('Tempo esgotado ao baixar o checksum.')));
    req.on('error',reject);
  });
}

async function resolveLatest(){
  if(RELEASE_REPO && RELEASE_REPO!=='__RELEASE_REPO__'){
    const rel=await requestGithubLatestRelease(RELEASE_REPO);
    const exe=rel.assets?.find(a=>/^ChronoCord-Setup-.*\.exe$/i.test(a.name));
    const sha=rel.assets?.find(a=>/^ChronoCord-Setup-.*\.sha256$/i.test(a.name));
    if(!exe||!sha) throw new Error('A release mais recente não contém o instalador e o checksum esperados.');
    const checksumText=await requestText(sha.browser_download_url);
    const checksum=(checksumText.match(/[a-f0-9]{64}/i)||[])[0];
    if(!checksum) throw new Error('Checksum SHA-256 inválido na release.');
    return {product:'ChronoCord',version:rel.tag_name.replace(/^chronocord-v/i,'').replace(/^v/i,''),title:rel.name||rel.tag_name,notes:rel.body||'',mandatory:false,size:exe.size||0,url:exe.browser_download_url,sha256:checksum};
  }
  return requestJson(MANIFEST_URL);
}
function cmp(a,b){const pa=String(a).replace(/^v/i,'').split('-')[0].split('.').map(Number);const pb=String(b).replace(/^v/i,'').split('-')[0].split('.').map(Number);for(let i=0;i<3;i++){if((pa[i]||0)!==(pb[i]||0))return (pa[i]||0)-(pb[i]||0)}return 0}
function requestJson(url){return new Promise((resolve,reject)=>{const u=new URL(url);const req=https.get(u,{headers:{'User-Agent':'ChronoCord-Updater/1.0','Accept':'application/json','Cache-Control':'no-cache'}},res=>{let data='';res.setEncoding('utf8');res.on('data',d=>data+=d);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error(`HTTP ${res.statusCode}`));try{resolve(JSON.parse(data))}catch{reject(new Error('Manifesto inválido.'))}})});req.setTimeout(15000,()=>req.destroy(new Error('Tempo esgotado.')));req.on('error',reject)})}
function download(url,dest,onProgress,redirects=0){
  if(redirects>5)return Promise.reject(new Error('Muitos redirecionamentos ao baixar a atualização.'));
  const u=new URL(url);
  if(u.protocol!=='https:')return Promise.reject(new Error('A atualização deve usar HTTPS.'));
  return new Promise((resolve,reject)=>{
    const file=fs.createWriteStream(dest);
    const fail=(error)=>{file.close(()=>{});fs.rmSync(dest,{force:true});reject(error)};
    const req=https.get(u,{headers:{'User-Agent':'ChronoCord-Updater/1.0'}},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){
        res.resume();
        file.close(()=>{
          fs.rmSync(dest,{force:true});
          download(new URL(res.headers.location,u).href,dest,onProgress,redirects+1).then(resolve,reject);
        });
        return;
      }
      if(res.statusCode!==200){res.resume();return fail(new Error(`Download HTTP ${res.statusCode}`))}
      const total=Number(res.headers['content-length']||0);let done=0;
      res.on('data',chunk=>{done+=chunk.length;onProgress?.(total?Math.round(done/total*100):0)});
      res.pipe(file);
      file.on('finish',()=>file.close(resolve));
      res.on('error',fail);
    });
    req.setTimeout(120000,()=>req.destroy(new Error('Download expirou.')));
    req.on('error',fail);
  });
}
function sha256(file){return new Promise((resolve,reject)=>{const h=crypto.createHash('sha256');const s=fs.createReadStream(file);s.on('data',d=>h.update(d));s.on('end',()=>resolve(h.digest('hex')));s.on('error',reject)})}
function waitPid(pid){return new Promise((resolve,reject)=>{if(!pid||pid===process.pid)return resolve();const started=Date.now();const check=()=>{try{process.kill(pid,0);if(Date.now()-started>20000)return reject(new Error('O ChronoCord não encerrou a tempo para atualizar.'));setTimeout(check,250)}catch{resolve()}};check()})}
function runProcess(file,args){return new Promise((resolve,reject)=>{const child=spawn(file,args,{detached:false,stdio:'ignore',windowsHide:true});child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(`Instalador encerrou com código ${code}.`)))})}
async function createWindow(){win=new BrowserWindow({width:400,height:250,minWidth:400,minHeight:250,maxWidth:400,maxHeight:250,resizable:false,frame:false,transparent:true,backgroundColor:'#00000000',show:false,skipTaskbar:true,hasShadow:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.cjs')}});await win.loadFile(path.join(__dirname,'ui.html'))}
function send(type,data){if(win&&!win.isDestroyed())win.webContents.send('updater:event',{type,...data})}
async function performUpdate(manifest){
  const dest=path.join(app.getPath('temp'),`ChronoCord-Setup-${manifest.version}.exe`);
  send('state',{step:'download',progress:2,text:'Baixando atualização…'});
  await download(manifest.url,dest,p=>send('state',{step:'download',progress:Math.max(2,Math.min(70,Math.round(p*0.7))),text:'Baixando atualização…'}));
  send('state',{step:'verify',progress:74,text:'Verificando atualização…'});
  const actual=await sha256(dest); if(actual.toLowerCase()!==String(manifest.sha256||'').toLowerCase()){fs.rmSync(dest,{force:true});throw new Error('A verificação de integridade falhou. O instalador foi descartado.')}
  send('state',{step:'update',progress:82,text:'Atualizando ChronoCord…'});
  if (appPid && process.platform === 'win32') { await new Promise((resolve)=>execFile('taskkill',['/PID',String(appPid),'/T'],{windowsHide:true},()=>resolve())); }
  await waitPid(appPid);
  const installArgs=['/S'];
  if(appExe) installArgs.push(`/D=${path.dirname(appExe)}`);
  await runProcess(dest,installArgs);
  send('state',{step:'finalize',progress:96,text:'Concluindo…'});
  fs.rmSync(dest,{force:true});
  if(!appExe||!fs.existsSync(appExe)) throw new Error('O ChronoCord atualizado não foi encontrado para reiniciar.');
  send('state',{step:'done',progress:100,text:'Abrindo o ChronoCord…'});
  const child=spawn(appExe,[],{detached:true,stdio:'ignore',windowsHide:false}); child.unref();
  setTimeout(()=>app.quit(),900);
}
app.whenReady().then(async()=>{
  await createWindow();
  try{
    const m=await resolveLatest();
    if(!m||m.product!=='ChronoCord'||!m.version||!m.url||!m.sha256)throw new Error('Atualização inválida.');
    if(cmp(m.version,currentVersion)<=0){app.quit();return}
    win.show();
    await performUpdate(m);
  }catch(e){
    if(win&&!win.isDestroyed()&&win.isVisible()) send('error',{text:e.message||'Não foi possível atualizar.'});
    else app.quit();
  }
});
app.on('window-all-closed',()=>app.quit());
