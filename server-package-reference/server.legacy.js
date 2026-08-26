'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const { Server } = require('socket.io');

const app = express();
const PLATFORM_VERSION = process.env.CC_PLATFORM_VERSION || '1.0.0';
const PROTOCOL_VERSION = Number(process.env.CC_PROTOCOL_VERSION || 1);
const PLATFORM_FEATURES = (()=>{ try{return JSON.parse(process.env.CC_FEATURES||'{}')}catch{return {}} })();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3001);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (IS_PRODUCTION ? null : 'chronocord-local-development-only-secret');
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET ausente ou fraco. Configure um segredo aleatório de pelo menos 32 caracteres.');
}

const DB_PATH = path.join(__dirname, 'data.json');
const TMP_DB_PATH = `${DB_PATH}.tmp`;
const MAX_JSON = process.env.MAX_JSON || '8mb';
const MAX_TEXT = 4000;
const MAX_NAME = 50;
const MAX_ASSET_DATA = 5 * 1024 * 1024;
const MAX_MESSAGES = 200;
const MAX_AUDIT = 5000;

const emptyDB = () => ({
  users: [], servers: [], channels: [], messages: [], roles: [], invites: [], bans: [],
  audit: [], emojis: [], stickers: [], sounds: [], decorations: [], profiles: [],
  friendships: [], dms: [], reactions: [], pins: [], settings: [], voice: [], sync: []
});

let db = loadDB();
let saveQueue = Promise.resolve();
const rateBuckets = new Map();
const messageBuckets = new Map();
const voiceRooms = new Map();
const syncBuckets = new Map();

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const fresh = emptyDB();
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2), 'utf8');
    return fresh;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return { ...emptyDB(), ...parsed };
  } catch (err) {
    console.error('Falha ao ler data.json:', err.message);
    throw new Error('Banco de dados inválido. Faça backup e restaure data.json.');
  }
}

function saveDB() {
  const snapshot = JSON.stringify(db);
  saveQueue = saveQueue.then(() => fs.promises.writeFile(TMP_DB_PATH, snapshot, 'utf8').then(() => fs.promises.rename(TMP_DB_PATH, DB_PATH)));
  return saveQueue;
}

function now() { return new Date().toISOString(); }
function cleanString(value, max = MAX_TEXT) { return String(value ?? '').trim().slice(0, max); }
function validId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{4,80}$/.test(value); }
function findServer(id) { return db.servers.find(s => s.id === id); }
function findChannel(id) { return db.channels.find(c => c.id === id); }
function member(server, userId) { return server?.members?.find(m => m.userId === userId); }
function banned(server, userId) { return db.bans.some(b => b.serverId === server?.id && b.userId === userId); }
function isOwner(server, userId) { return server?.ownerId === userId; }
function roleFor(server, userId) {
  const m = member(server, userId);
  if (!m) return null;
  if (m.role === 'owner') return db.roles.find(r => r.serverId === server.id && r.name === 'Dono');
  return db.roles.find(r => r.id === m.roleId) || db.roles.find(r => r.serverId === server.id && r.name === (m.role || 'Membro')) || null;
}
function hasPermission(server, userId, permission) {
  if (isOwner(server, userId)) return true;
  const role = roleFor(server, userId);
  return !!role && (role.permissions?.includes('*') || role.permissions?.includes(permission));
}
function canManage(server, userId) { return hasPermission(server, userId, 'manage_server') || hasPermission(server, userId, 'moderate'); }
function canManageRoles(server, userId) { return hasPermission(server, userId, 'manage_roles'); }
function canSend(channel, server, userId) { return !!member(server, userId) && !banned(server, userId) && (!channel.restricted || hasPermission(server, userId, 'send_messages') || isOwner(server, userId)); }
function addAudit(serverId, actorId, action, meta = {}) {
  db.audit.unshift({ id: nanoid(12), serverId, actorId, action: cleanString(action, 180), meta, createdAt: now() });
  db.audit = db.audit.slice(0, MAX_AUDIT);
}
function publicUser(u) {
  return u ? { id: u.id, username: u.username, createdAt: u.createdAt, avatar: u.avatar || null, banner: u.banner || null, aboutMe: u.aboutMe || '', nameStyle: u.nameStyle || null, status: u.status || 'online' } : null;
}
function ensureOwnerRole(server) {
  const defaults = [
    { name: 'Dono', color: '#E8A33D', icon: '👑', permissions: ['*'], position: 1000 },
    { name: 'Moderador', color: '#5B8CFF', icon: '🛡️', permissions: ['manage_channels', 'manage_server', 'moderate', 'manage_roles'], position: 500 },
    { name: 'Membro', color: '#9A93B8', icon: '●', permissions: ['view', 'send_messages'], position: 1 }
  ];
  for (const d of defaults) if (!db.roles.some(r => r.serverId === server.id && r.name === d.name)) db.roles.push({ id: nanoid(10), serverId: server.id, ...d });
}
function serverPayload(s, userId) {
  const channels = db.channels.filter(c => c.serverId === s.id).sort((a,b)=>(a.position||0)-(b.position||0));
  const members = s.members.map(m => {
    const u = db.users.find(x => x.id === m.userId);
    const r = db.roles.find(x => x.id === m.roleId) || db.roles.find(x => x.serverId === s.id && x.name === (m.role === 'owner' ? 'Dono' : m.role === 'moderator' ? 'Moderador' : 'Membro'));
    return { ...m, user: publicUser(u), role: r ? { id:r.id, name:r.name, color:r.color, icon:r.icon, permissions:r.permissions } : null };
  });
  return { ...s, inviteCode: isOwner(s, userId) || canManage(s, userId) ? s.inviteCode : undefined, channels, members, roles: db.roles.filter(r=>r.serverId===s.id).sort((a,b)=>(b.position||0)-(a.position||0)), settings: db.settings.find(x=>x.serverId===s.id)?.data || {} };
}

function rateLimit(name, windowMs, max) {
  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const t = Date.now();
    let b = rateBuckets.get(key);
    if (!b || t - b.start >= windowMs) b = { start:t, count:0 };
    b.count++;
    rateBuckets.set(key,b);
    if (b.count > max) return res.status(429).json({ error:'Muitas tentativas. Aguarde um pouco.' });
    next();
  };
}
setInterval(() => { const cutoff = Date.now() - 15*60*1000; for (const [k,b] of rateBuckets) if (b.start < cutoff) rateBuckets.delete(k); const messageCutoff = Date.now() - 60*1000; for (const [k,b] of messageBuckets) if (b.start < messageCutoff) messageBuckets.delete(k); }, 5*60*1000).unref();

app.disable('x-powered-by');
app.use((req,res,next)=>{ res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','no-referrer'); res.setHeader('Permissions-Policy','camera=(self), microphone=(self)'); next(); });
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'https://chronocord-server.onrender.com').split(',').map(s=>s.trim()).filter(Boolean);
function isAllowedOrigin(origin) {
  if (!origin || origin === 'null') return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const u = new URL(origin);
    // Electron desktop client is served from a private loopback HTTP origin.
    if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) return true;
    // Capacitor Android/iOS local webview origin.
    if ((u.protocol === 'capacitor:' || u.protocol === 'ionic:') && u.hostname === 'localhost') return true;
  } catch {}
  return false;
}
app.use(cors({ origin: true, methods:['GET','POST','PATCH','PUT','DELETE','OPTIONS'], credentials:false, maxAge: 86400 }));
app.use(express.json({ limit: MAX_JSON, strict: true }));
app.use((err, req, res, next) => { if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({error:'JSON inválido.'}); if (err.message === 'Origin não autorizado') return res.status(403).json({error:err.message}); next(err); });

app.get('/health', (_req,res)=>res.status(200).json({ ok:true, name:'ChronoCord Server', version:PLATFORM_VERSION, protocolVersion:PROTOCOL_VERSION, time:now() }));
app.get('/api/health', (_req,res)=>res.status(200).json({ ok:true, name:'ChronoCord Server', version:PLATFORM_VERSION, protocolVersion:PROTOCOL_VERSION, time:now() }));
app.get('/', (_req,res)=>res.json({ name:'ChronoCord Server', version:PLATFORM_VERSION, protocolVersion:PROTOCOL_VERSION, status:'online' }));
app.get('/api/meta', (_req,res)=>res.json({ name:'ChronoCord Server', platformVersion:PLATFORM_VERSION, protocolVersion:PROTOCOL_VERSION, minimumSupportedClient:'0.5.0', time:now() }));
app.get('/api/capabilities', (_req,res)=>res.json({ platformVersion:PLATFORM_VERSION, protocolVersion:PROTOCOL_VERSION, features:PLATFORM_FEATURES }));

function tokenFor(user) { return jwt.sign({ id:user.id, username:user.username }, JWT_SECRET, { expiresIn:'7d', issuer:'chronocord', audience:'chronocord-client' }); }
function auth(req,res,next) {
  const h = req.headers.authorization || ''; const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token || token.length > 4096) return res.status(401).json({error:'Não autenticado.'});
  try { req.user = jwt.verify(token, JWT_SECRET, { issuer:'chronocord', audience:'chronocord-client' }); next(); }
  catch { return res.status(401).json({error:'Sessão inválida ou expirada.'}); }
}
function socketAuth(socket,next) { try { socket.user=jwt.verify(socket.handshake.auth?.token||'',JWT_SECRET,{issuer:'chronocord',audience:'chronocord-client'}); next(); } catch { next(new Error('Não autenticado.')); } }
function requireServer(req,res,next) { const s=findServer(req.params.id); if(!s || !member(s,req.user.id) || banned(s,req.user.id)) return res.status(403).json({error:'Sem acesso.'}); req.ccServer=s; next(); }

// AUTH
app.post('/api/register', rateLimit('register', 15*60*1000, 10), async (req,res)=>{
  const name=cleanString(req.body?.username,32); const password=String(req.body?.password||'');
  if(!/^[\p{L}\p{N}_.-]{3,32}$/u.test(name) || password.length<8 || password.length>128) return res.status(400).json({error:'Usuário inválido ou senha precisa ter 8–128 caracteres.'});
  if(db.users.some(u=>u.username.toLowerCase()===name.toLowerCase())) return res.status(409).json({error:'Esse nome de usuário já existe.'});
  const user={id:nanoid(10),username:name,passwordHash:await bcrypt.hash(password,12),createdAt:now(),status:'online'};
  db.users.push(user); db.profiles.push({userId:user.id}); await saveDB(); res.json({token:tokenFor(user),user:publicUser(user)});
});
app.post('/api/login', rateLimit('login', 15*60*1000, 30), async (req,res)=>{
  const name=cleanString(req.body?.username,32); const password=String(req.body?.password||''); const u=db.users.find(x=>x.username.toLowerCase()===name.toLowerCase());
  const ok=u ? await bcrypt.compare(password,u.passwordHash) : false;
  if(!ok) return res.status(401).json({error:'Usuário ou senha incorretos.'});
  u.lastLoginAt=now(); await saveDB(); res.json({token:tokenFor(u),user:publicUser(u)});
});
app.get('/api/me',auth,(req,res)=>{const u=db.users.find(x=>x.id===req.user.id);if(!u)return res.status(404).json({error:'Usuário não encontrado.'});res.json(publicUser(u));});
app.patch('/api/me',auth,async(req,res)=>{const u=db.users.find(x=>x.id===req.user.id);if(!u)return res.status(404).json({error:'Usuário não encontrado.'});
  if('username' in req.body){const n=cleanString(req.body.username,32);if(!/^[\p{L}\p{N}_.-]{3,32}$/u.test(n)||db.users.some(x=>x.id!==u.id&&x.username.toLowerCase()===n.toLowerCase()))return res.status(409).json({error:'Nome de usuário indisponível.'});u.username=n;}
  for(const k of ['avatar','banner','aboutMe','nameStyle','status']) if(k in req.body){const v=typeof req.body[k]==='string'?req.body[k].slice(0,MAX_ASSET_DATA):req.body[k];u[k]=v;}
  await saveDB();res.json(publicUser(u));
});

// WebRTC configuration. Optional TURN credentials can be supplied as JSON in RTC_ICE_SERVERS.
app.get('/api/rtc-config',auth,(req,res)=>{
  let ice=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}];
  try { if(process.env.RTC_ICE_SERVERS){ const parsed=JSON.parse(process.env.RTC_ICE_SERVERS); if(Array.isArray(parsed)&&parsed.length) ice=parsed.slice(0,8); } } catch {}
  res.json({iceServers:ice});
});

// SERVERS
app.get('/api/servers',auth,(req,res)=>res.json(db.servers.filter(s=>member(s,req.user.id)&&!banned(s,req.user.id)).map(s=>serverPayload(s,req.user.id))));
app.post('/api/servers',auth,async(req,res)=>{const name=cleanString(req.body?.name,MAX_NAME);if(!name)return res.status(400).json({error:'Dê um nome ao servidor.'});
  const s={id:nanoid(10),name,ownerId:req.user.id,inviteCode:nanoid(10),members:[{userId:req.user.id,role:'owner',joinedAt:now()}],createdAt:now(),icon:null,banner:null,tag:null,description:'',characteristics:[]};
  db.servers.push(s);const c={id:nanoid(10),serverId:s.id,name:'geral',type:'text',category:'Canais',position:0,restricted:false};db.channels.push(c);ensureOwnerRole(s);db.settings.push({serverId:s.id,data:{verificationLevel:'nenhum',contentFilter:'todos',accessMode:'convite',rulesEnabled:false,securityAlerts:true,automod:{enabled:false,blockedWords:[]}}});addAudit(s.id,req.user.id,'criou o servidor');await saveDB();res.json(serverPayload(s,req.user.id));
});
app.post('/api/servers/join',auth,async(req,res)=>{const code=cleanString(req.body?.code,40);const s=db.servers.find(x=>x.inviteCode===code);const invite=db.invites.find(i=>i.code===code&&!i.revoked&&(i.maxUses==null||i.uses<i.maxUses));const target=s|| (invite&&findServer(invite.serverId));if(!target)return res.status(404).json({error:'Convite inválido ou expirado.'});if(banned(target,req.user.id))return res.status(403).json({error:'Você está banido deste servidor.'});if(!member(target,req.user.id)){target.members.push({userId:req.user.id,role:'member',joinedAt:now()});if(invite)invite.uses++;addAudit(target.id,req.user.id,'entrou no servidor');await saveDB();}res.json(serverPayload(target,req.user.id));});
app.patch('/api/servers/:id',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});for(const k of ['name','icon','banner','tag','description','characteristics'])if(k in req.body){s[k]=typeof req.body[k]==='string'?req.body[k].slice(0,MAX_ASSET_DATA):req.body[k];}if(req.body.settings&&typeof req.body.settings==='object'){let st=db.settings.find(x=>x.serverId===s.id);if(!st){st={serverId:s.id,data:{}};db.settings.push(st);}st.data={...st.data,...req.body.settings};}addAudit(s.id,req.user.id,'alterou configurações do servidor');await saveDB();io.to(`server:${s.id}`).emit('server-updated',serverPayload(s,req.user.id));res.json(serverPayload(s,req.user.id));});
app.delete('/api/servers/:id/members/me',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!member(s,req.user.id)||banned(s,req.user.id))return res.status(404).json({error:'Você não está neste servidor.'});if(isOwner(s,req.user.id))return res.status(400).json({error:'O dono não pode sair do próprio servidor. Transfira a posse ou exclua o servidor.'});s.members=s.members.filter(m=>m.userId!==req.user.id);addAudit(s.id,req.user.id,'saiu do servidor');await saveDB();io.to(`server:${s.id}`).emit('member-left',{serverId:s.id,userId:req.user.id});res.json({ok:true});});
app.patch('/api/servers/:id/members/me',auth,async(req,res)=>{const s=findServer(req.params.id);const m=s&&member(s,req.user.id);if(!s||!m||banned(s,req.user.id))return res.status(404).json({error:'Você não está neste servidor.'});if('nickname' in req.body){const n=cleanString(req.body.nickname,32);m.nickname=n||null;}if('avatar' in req.body){m.avatar=typeof req.body.avatar==='string'?req.body.avatar.slice(0,MAX_ASSET_DATA):null;}await saveDB();io.to(`server:${s.id}`).emit('member-updated',{serverId:s.id,userId:req.user.id});res.json({ok:true,nickname:m.nickname||null,avatar:m.avatar||null});});
app.delete('/api/servers/:id',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s)return res.status(404).json({error:'Servidor não encontrado.'});if(!isOwner(s,req.user.id))return res.status(403).json({error:'Apenas o dono pode excluir o servidor.'});const channelIds=new Set(db.channels.filter(c=>c.serverId===s.id).map(c=>c.id));for(const key of ['servers','channels','roles','invites','bans','audit','emojis','stickers','sounds','decorations','settings','voice','sync'])db[key]=db[key].filter(x=>x.serverId!==s.id);db.messages=db.messages.filter(x=>!channelIds.has(x.channelId));db.reactions=db.reactions.filter(x=>!db.messages.some(m=>m.id===x.messageId));db.pins=db.pins.filter(x=>!channelIds.has(x.channelId));await saveDB();io.to(`server:${s.id}`).emit('server-deleted',s.id);res.json({ok:true});});

// CHANNELS
app.get('/api/servers/:id/channels',auth,requireServer,(req,res)=>res.json(db.channels.filter(c=>c.serverId===req.params.id).sort((a,b)=>(a.position||0)-(b.position||0))));
app.post('/api/servers/:id/channels',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!hasPermission(s,req.user.id,'manage_channels'))return res.status(403).json({error:'Sem permissão.'});const name=cleanString(req.body?.name,MAX_NAME);if(!name)return res.status(400).json({error:'Nome obrigatório.'});const type=['text','announcement','voice','stage'].includes(req.body?.type)?req.body.type:'text';const c={id:nanoid(10),serverId:s.id,name,type,category:cleanString(req.body?.category,50)||'Canais',position:db.channels.filter(x=>x.serverId===s.id).length,restricted:!!req.body?.restricted};db.channels.push(c);addAudit(s.id,req.user.id,`criou o canal #${name}`);await saveDB();io.to(`server:${s.id}`).emit('channel-created',c);res.json(c);});
app.patch('/api/channels/:id',auth,async(req,res)=>{const c=findChannel(req.params.id),s=findServer(c?.serverId);if(!c||!s||!hasPermission(s,req.user.id,'manage_channels'))return res.status(403).json({error:'Sem permissão.'});for(const k of ['name','type','category','position','restricted'])if(k in req.body)c[k]=k==='name'||k==='category'?cleanString(req.body[k],MAX_NAME):req.body[k];await saveDB();io.to(`server:${s.id}`).emit('channel-updated',c);res.json(c);});
app.delete('/api/channels/:id',auth,async(req,res)=>{const c=findChannel(req.params.id),s=findServer(c?.serverId);if(!c||!s||!hasPermission(s,req.user.id,'manage_channels'))return res.status(403).json({error:'Sem permissão.'});if(db.channels.filter(x=>x.serverId===s.id).length<=1)return res.status(400).json({error:'O servidor precisa manter pelo menos um canal.'});db.channels=db.channels.filter(x=>x.id!==c.id);db.messages=db.messages.filter(x=>x.channelId!==c.id);db.reactions=db.reactions.filter(x=>db.messages.some(m=>m.id===x.messageId));db.pins=db.pins.filter(x=>x.channelId!==c.id);await saveDB();io.to(`server:${s.id}`).emit('channel-deleted',c.id);res.json({ok:true});});

// MESSAGES
app.get('/api/channels/:id/messages',auth,(req,res)=>{const c=findChannel(req.params.id),s=findServer(c?.serverId);if(!c||!s||!canSend(c,s,req.user.id))return res.status(403).json({error:'Sem acesso.'});res.json(db.messages.filter(m=>m.channelId===c.id).slice(-MAX_MESSAGES));});
function messageAllowed(userId, channelId) {
  const key = `${userId}:${channelId}`; const t = Date.now(); let b = messageBuckets.get(key);
  if (!b || t - b.start >= 10000) b = { start:t, count:0 };
  b.count++; messageBuckets.set(key,b); return b.count <= 8;
}
function automodAllows(s, text, userId) {
  const settings = db.settings.find(x=>x.serverId===s.id)?.data || {};
  const automod = settings.automod || {};
  if (!automod.enabled) return true;
  const normalized = cleanString(text, MAX_TEXT).toLocaleLowerCase('pt-BR');
  const words = Array.isArray(automod.blockedWords) ? automod.blockedWords.filter(x=>typeof x==='string').slice(0,100) : [];
  const hit = words.find(word => word.trim() && normalized.includes(word.trim().toLocaleLowerCase('pt-BR')));
  if (hit) { addAudit(s.id, userId, 'AutoMod bloqueou uma mensagem', { word: hit.slice(0,40) }); return false; }
  return true;
}

async function createMessage(c,s,userId,text,attachment,replyTo){if(!canSend(c,s,userId))throw Object.assign(new Error('Sem permissão.'),{status:403});if(!messageAllowed(userId,c.id))throw Object.assign(new Error('Você está enviando mensagens rápido demais.'),{status:429});const cleanText=cleanString(text,MAX_TEXT);if(!automodAllows(s,cleanText,userId))throw Object.assign(new Error('Sua mensagem foi bloqueada pelo AutoMod.'),{status:400});if(!cleanText&&!attachment)throw Object.assign(new Error('Mensagem vazia.'),{status:400});if(typeof attachment==='string'&&attachment.length>MAX_ASSET_DATA)throw Object.assign(new Error('Anexo grande demais.'),{status:413});const msg={id:nanoid(12),channelId:c.id,authorId:userId,authorName:db.users.find(u=>u.id===userId)?.username||'Usuário',text:cleanText,attachment:attachment||null,replyTo:validId(replyTo)?replyTo:null,createdAt:now(),edited:false};db.messages.push(msg);await saveDB();return msg;}
app.post('/api/channels/:id/messages',auth,async(req,res)=>{try{const c=findChannel(req.params.id),s=findServer(c?.serverId);if(!c||!s)return res.status(404).json({error:'Canal não encontrado.'});const m=await createMessage(c,s,req.user.id,req.body?.text,req.body?.attachment,req.body?.replyTo);io.to(`channel:${c.id}`).emit('new-message',m);res.json(m);}catch(e){res.status(e.status||500).json({error:e.message||'Erro ao enviar mensagem.'});}});
app.patch('/api/messages/:id',auth,async(req,res)=>{const m=db.messages.find(x=>x.id===req.params.id);if(!m)return res.status(404).json({error:'Mensagem não encontrada.'});const c=findChannel(m.channelId),s=findServer(c?.serverId);if(!c||!s||m.authorId!==req.user.id&&!hasPermission(s,req.user.id,'moderate'))return res.status(403).json({error:'Sem permissão.'});m.text=cleanString(req.body?.text??m.text,MAX_TEXT);m.edited=true;await saveDB();io.to(`channel:${m.channelId}`).emit('message-updated',m);res.json(m);});
app.delete('/api/messages/:id',auth,async(req,res)=>{const m=db.messages.find(x=>x.id===req.params.id);if(!m)return res.status(404).json({error:'Mensagem não encontrada.'});const c=findChannel(m.channelId),s=findServer(c?.serverId);if(!c||!s||m.authorId!==req.user.id&&!hasPermission(s,req.user.id,'moderate'))return res.status(403).json({error:'Sem permissão.'});db.messages=db.messages.filter(x=>x.id!==m.id);db.reactions=db.reactions.filter(x=>x.messageId!==m.id);db.pins=db.pins.filter(x=>x.messageId!==m.id);await saveDB();io.to(`channel:${m.channelId}`).emit('message-deleted',m.id);res.json({ok:true});});
app.post('/api/messages/:id/reactions',auth,async(req,res)=>{const m=db.messages.find(x=>x.id===req.params.id),c=findChannel(m?.channelId),s=findServer(c?.serverId);if(!m||!c||!s||!member(s,req.user.id)||banned(s,req.user.id))return res.status(403).json({error:'Sem acesso.'});const emoji=cleanString(req.body?.emoji,16);if(!emoji)return res.status(400).json({error:'Reação inválida.'});let r=db.reactions.find(x=>x.messageId===m.id&&x.emoji===emoji);if(!r){r={messageId:m.id,emoji,users:[]};db.reactions.push(r);}if(r.users.includes(req.user.id))r.users=r.users.filter(x=>x!==req.user.id);else r.users.push(req.user.id);if(!r.users.length)db.reactions=db.reactions.filter(x=>x!==r);await saveDB();io.to(`channel:${m.channelId}`).emit('reaction-updated',{messageId:m.id,emoji,users:r.users});res.json(r);});
app.post('/api/messages/:id/pin',auth,async(req,res)=>{const m=db.messages.find(x=>x.id===req.params.id),c=findChannel(m?.channelId),s=findServer(c?.serverId);if(!m||!c||!s||!hasPermission(s,req.user.id,'moderate'))return res.status(403).json({error:'Sem permissão.'});const existing=db.pins.find(x=>x.messageId===m.id);if(existing)db.pins=db.pins.filter(x=>x!==existing);else db.pins.push({id:nanoid(10),messageId:m.id,channelId:c.id,pinnedBy:req.user.id,createdAt:now()});await saveDB();res.json({pinned:!existing});});

// MEMBERS / ROLES
app.get('/api/servers/:id/members',auth,requireServer,(req,res)=>res.json(req.ccServer.members.map(m=>{const u=db.users.find(x=>x.id===m.userId);const r=roleFor(req.ccServer,m.userId);return {...m,user:publicUser(u),role:r||null};})));
app.patch('/api/servers/:id/members/:userId',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!canManageRoles(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});const m=member(s,req.params.userId);if(!m)return res.status(404).json({error:'Membro não encontrado.'});if(req.params.userId===s.ownerId)return res.status(400).json({error:'O dono não pode ter o cargo alterado.'});const r=db.roles.find(x=>x.id===req.body?.roleId&&x.serverId===s.id);if(!r)return res.status(400).json({error:'Cargo inválido.'});if(r.name==='Dono')return res.status(400).json({error:'Cargo de dono protegido.'});m.roleId=r.id;m.role=r.name;addAudit(s.id,req.user.id,'alterou cargo de membro',{userId:req.params.userId,roleId:r.id});await saveDB();io.to(`server:${s.id}`).emit('member-updated',{serverId:s.id,userId:req.params.userId});res.json(m);});
app.post('/api/servers/:id/roles',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!canManageRoles(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});const name=cleanString(req.body?.name,50)||'Novo cargo';if(db.roles.some(x=>x.serverId===s.id&&x.name.toLowerCase()===name.toLowerCase()))return res.status(409).json({error:'Esse cargo já existe.'});const r={id:nanoid(10),serverId:s.id,name,color:/^#[0-9a-fA-F]{6}$/.test(req.body?.color||'')?req.body.color:'#5B8CFF',icon:cleanString(req.body?.icon,8)||'●',permissions:Array.isArray(req.body?.permissions)?req.body.permissions.filter(x=>typeof x==='string').slice(0,30):['view','send_messages'],position:Number.isFinite(Number(req.body?.position))?Math.max(1,Math.min(999,Number(req.body.position))):10};db.roles.push(r);addAudit(s.id,req.user.id,`criou o cargo ${r.name}`);await saveDB();io.to(`server:${s.id}`).emit('role-created',r);res.json(r);});
app.patch('/api/roles/:id',auth,async(req,res)=>{const r=db.roles.find(x=>x.id===req.params.id),s=findServer(r?.serverId);if(!r||!s||!canManageRoles(s,req.user.id)||['Dono','Moderador','Membro'].includes(r.name))return res.status(403).json({error:'Cargo protegido ou sem permissão.'});for(const k of ['name','icon'])if(k in req.body)r[k]=cleanString(req.body[k],50);if('color'in req.body&&/^#[0-9a-fA-F]{6}$/.test(req.body.color))r.color=req.body.color;if(Array.isArray(req.body.permissions))r.permissions=req.body.permissions.filter(x=>typeof x==='string').slice(0,30);if('position'in req.body)r.position=Math.max(1,Math.min(999,Number(req.body.position)||1));await saveDB();io.to(`server:${s.id}`).emit('role-updated',r);res.json(r);});
app.delete('/api/roles/:id',auth,async(req,res)=>{const r=db.roles.find(x=>x.id===req.params.id),s=findServer(r?.serverId);if(!r||!s||!canManageRoles(s,req.user.id)||['Dono','Moderador','Membro'].includes(r.name))return res.status(403).json({error:'Cargo protegido ou sem permissão.'});db.roles=db.roles.filter(x=>x.id!==r.id);s.members.forEach(m=>{if(m.roleId===r.id){m.roleId=null;m.role='member';}});await saveDB();res.json({ok:true});});

// INVITES / BANS / AUDIT
app.get('/api/servers/:id/invites',auth,(req,res)=>{const s=findServer(req.params.id);if(!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});res.json(db.invites.filter(i=>i.serverId===s.id&&!i.revoked));});
app.post('/api/servers/:id/invites',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});const raw=req.body?.maxUses;const max=raw==null?null:Math.max(1,Math.min(100000,Number(raw)));if(raw!=null&&!Number.isFinite(max))return res.status(400).json({error:'Limite de usos inválido.'});const i={id:nanoid(10),serverId:s.id,code:nanoid(10),maxUses:max,uses:0,createdBy:req.user.id,revoked:false,createdAt:now()};db.invites.push(i);await saveDB();res.json(i);});
app.delete('/api/invites/:id',auth,async(req,res)=>{const i=db.invites.find(x=>x.id===req.params.id),s=findServer(i?.serverId);if(!i||!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});i.revoked=true;await saveDB();res.json({ok:true});});
app.get('/api/servers/:id/bans',auth,(req,res)=>{const s=findServer(req.params.id);if(!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});res.json(db.bans.filter(b=>b.serverId===s.id));});
app.post('/api/servers/:id/bans',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!hasPermission(s,req.user.id,'moderate'))return res.status(403).json({error:'Sem permissão.'});const userId=cleanString(req.body?.userId,80);if(!userId||userId===s.ownerId)return res.status(400).json({error:'Membro não pode ser banido.'});if(!member(s,userId))return res.status(404).json({error:'Membro não encontrado.'});const target=member(s,userId);if(target.role==='owner'||(target.role==='moderator'&&!isOwner(s,req.user.id)))return res.status(403).json({error:'Não é possível banir esse membro.'});const u=db.users.find(x=>x.id===userId);const b={id:nanoid(10),serverId:s.id,userId,username:u?.username||'',reason:cleanString(req.body?.reason,300)||'Não especificado',createdAt:now(),createdBy:req.user.id};db.bans=db.bans.filter(x=>!(x.serverId===s.id&&x.userId===userId));db.bans.push(b);s.members=s.members.filter(m=>m.userId!==userId);addAudit(s.id,req.user.id,`baniu ${b.username||userId}`);await saveDB();io.to(`server:${s.id}`).emit('member-banned',b);res.json(b);});
app.delete('/api/bans/:id',auth,async(req,res)=>{const b=db.bans.find(x=>x.id===req.params.id),s=findServer(b?.serverId);if(!b||!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});db.bans=db.bans.filter(x=>x.id!==b.id);await saveDB();res.json({ok:true});});
app.get('/api/servers/:id/audit',auth,(req,res)=>{const s=findServer(req.params.id);if(!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});res.json(db.audit.filter(a=>a.serverId===s.id).slice(0,500));});

// CUSTOM ASSETS
for(const kind of ['emojis','stickers','sounds','decorations']){
  app.get(`/api/servers/:id/${kind}`,auth,requireServer,(req,res)=>res.json(db[kind].filter(x=>x.serverId===req.params.id)));
  app.post(`/api/servers/:id/${kind}`,auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});const data=typeof req.body?.data==='string'?req.body.data:null;if(data&&data.length>MAX_ASSET_DATA)return res.status(413).json({error:'Arquivo grande demais.'});const item={id:nanoid(10),serverId:s.id,name:cleanString(req.body?.name,50)||'item',data,type:cleanString(req.body?.type,100)||null,createdBy:req.user.id,createdAt:now()};db[kind].push(item);addAudit(s.id,req.user.id,`adicionou ${kind}: ${item.name}`);await saveDB();io.to(`server:${s.id}`).emit(`${kind.slice(0,-1)}-created`,item);res.json(item);});
  app.delete(`/api/${kind}/:id`,auth,async(req,res)=>{const item=db[kind].find(x=>x.id===req.params.id),s=findServer(item?.serverId);if(!item||!s||!canManage(s,req.user.id))return res.status(403).json({error:'Sem permissão.'});db[kind]=db[kind].filter(x=>x.id!==item.id);await saveDB();res.json({ok:true});});
}

// FRIENDS / DMS
app.get('/api/friends',auth,(req,res)=>{const ids=db.friendships.filter(f=>f.userId===req.user.id&&f.status==='accepted').map(f=>f.friendId);res.json(ids.map(id=>db.users.find(u=>u.id===id)).filter(Boolean).map(publicUser));});
app.post('/api/friends',auth,async(req,res)=>{const u=db.users.find(x=>x.username.toLowerCase()===cleanString(req.body?.username,32).toLowerCase());if(!u||u.id===req.user.id)return res.status(404).json({error:'Usuário não encontrado.'});if(!db.friendships.some(f=>f.userId===req.user.id&&f.friendId===u.id)){db.friendships.push({userId:req.user.id,friendId:u.id,status:'accepted',createdAt:now()},{userId:u.id,friendId:req.user.id,status:'accepted',createdAt:now()});await saveDB();}res.json(publicUser(u));});
app.delete('/api/friends/:id',auth,async(req,res)=>{db.friendships=db.friendships.filter(f=>!(f.userId===req.user.id&&f.friendId===req.params.id)&&!(f.userId===req.params.id&&f.friendId===req.user.id));await saveDB();res.json({ok:true});});
function dmKey(a,b){return [a,b].sort().join(':');}
app.get('/api/dms/:userId/messages',auth,(req,res)=>{if(req.params.userId===req.user.id)return res.json([]);const u=db.users.find(x=>x.id===req.params.userId);if(!u)return res.status(404).json({error:'Usuário não encontrado.'});res.json(db.dms.filter(m=>m.key===dmKey(req.user.id,u.id)).slice(-200));});
app.post('/api/dms/:userId/messages',auth,async(req,res)=>{const u=db.users.find(x=>x.id===req.params.userId);if(!u||u.id===req.user.id)return res.status(404).json({error:'Usuário não encontrado.'});const text=cleanString(req.body?.text,MAX_TEXT);if(!text)return res.status(400).json({error:'Mensagem vazia.'});const key=dmKey(req.user.id,u.id);const m={id:nanoid(12),key,authorId:req.user.id,authorName:req.user.username,text,createdAt:now()};db.dms.push(m);await saveDB();io.to(`dm:${key}`).emit('dm-message',m);res.json(m);});

// SYNC / VOICE STATE
const allowedSync=['jukebox','watch2'];
app.get('/api/servers/:id/sync/:kind',auth,requireServer,(req,res)=>{if(!allowedSync.includes(req.params.kind))return res.status(404).json({error:'Sincronização desconhecida.'});const row=db.sync.find(x=>x.serverId===req.params.id&&x.kind===req.params.kind);res.json(row?.data||null);});
app.put('/api/servers/:id/sync/:kind',auth,async(req,res)=>{const s=findServer(req.params.id);if(!s||!member(s,req.user.id)||banned(s,req.user.id))return res.status(403).json({error:'Sem acesso.'});if(!allowedSync.includes(req.params.kind))return res.status(404).json({error:'Sincronização desconhecida.'});let row=db.sync.find(x=>x.serverId===s.id&&x.kind===req.params.kind);if(!row){row={id:nanoid(10),serverId:s.id,kind:req.params.kind,data:{}};db.sync.push(row);}row.data=req.body?.data||{};row.updatedBy=req.user.id;row.updatedAt=now();await saveDB();io.to(`server:${s.id}`).emit('sync-state',{kind:row.kind,data:row.data});res.json(row.data);});

// SOCKET.IO — every room join is authorized server-side.
const io = new Server(server,{
  allowEIO3:false,
  cors:{origin:true,methods:['GET','POST','PATCH','PUT','DELETE','OPTIONS'],credentials:false,maxAge:86400},
  transports:['websocket','polling'],
  allowUpgrades:true,
  pingInterval:25000,
  pingTimeout:20000,
  maxHttpBufferSize:8*1024*1024
});
io.use((socket,next)=>{
  const clientVersion=String(socket.handshake.auth?.clientVersion||socket.handshake.headers['x-chronocord-client-version']||'unknown');
  socket.clientVersion=clientVersion;
  socket.protocolVersion=Number(socket.handshake.auth?.protocolVersion||socket.handshake.headers['x-chronocord-protocol-version']||1)||1;
  if(socket.protocolVersion<1){ return next(new Error('PROTO_TOO_OLD')); }
  next();
});
io.use(socketAuth);
io.on('connection',socket=>{
  const uid=socket.user.id;
  socket.emit('server-ready',{platformVersion:PLATFORM_VERSION,protocolVersion:PROTOCOL_VERSION,features:PLATFORM_FEATURES,clientVersion:socket.clientVersion||null});
  socket.join(`user:${uid}`);
  socket.on('join-server',serverId=>{const s=findServer(serverId);if(s&&member(s,uid)&&!banned(s,uid))socket.join(`server:${serverId}`);});
  socket.on('join-channel',channelId=>{const c=findChannel(channelId),s=findServer(c?.serverId);if(c&&s&&canSend(c,s,uid))socket.join(`channel:${channelId}`);});
  socket.on('leave-channel',channelId=>socket.leave(`channel:${channelId}`));
  socket.on('join-dm',userId=>{const u=db.users.find(x=>x.id===userId);if(u)socket.join(`dm:${dmKey(uid,userId)}`);});
  socket.on('send-message',async(payload={})=>{try{const c=findChannel(payload.channelId),s=findServer(c?.serverId);if(!c||!s)return;const m=await createMessage(c,s,uid,payload.text,payload.attachment,payload.replyTo);io.to(`channel:${c.id}`).emit('new-message',m);}catch{socket.emit('action-error',{action:'send-message',error:'Não foi possível enviar a mensagem.'});}});
  socket.on('typing',payload=>{const c=findChannel(payload?.channelId),s=findServer(c?.serverId);if(c&&s&&canSend(c,s,uid))socket.to(`channel:${c.id}`).emit('typing',{channelId:c.id,userId:uid,username:socket.user.username,isTyping:!!payload.isTyping});});
  socket.on('voice-join',(payload,ack)=>{
    const done=(v)=>{try{if(typeof ack==='function')ack(v)}catch{}};
    const c=findChannel(payload?.channelId),s=findServer(c?.serverId);
    if(!c||!s||!member(s,uid)||banned(s,uid)||!['voice','stage'].includes(c.type)){ const error='Sem acesso ao canal de voz ou canal inválido.'; socket.emit('voice-error',{channelId:payload?.channelId||null,error}); done({ok:false,error}); return; }
    if(!voiceRooms.has(c.id)) voiceRooms.set(c.id,new Map());
    const room=voiceRooms.get(c.id);
    const existing=[...room.values()].filter(p=>p.userId!==uid);
    const u=db.users.find(x=>x.id===uid);
    const entry={userId:uid,username:socket.user.username,channelId:c.id,user:publicUser(u),muted:false,deafened:false,handRaised:false};
    socket.join(`voice:${c.id}`); room.set(uid,entry);
    socket.emit('voice-participants',{channelId:c.id,participants:existing});
    socket.to(`voice:${c.id}`).emit('voice-peer-joined',entry); socket.emit('voice-joined',{channelId:c.id,participants:[...room.values()]}); done({ok:true,channelId:c.id});
  });
  socket.on('voice-leave',payload=>{
    const channelId=cleanString(payload?.channelId,80); if(!channelId)return;
    const room=voiceRooms.get(channelId); if(room) { room.delete(uid); if(!room.size)voiceRooms.delete(channelId); }
    socket.leave(`voice:${channelId}`); socket.to(`voice:${channelId}`).emit('voice-peer-left',{userId:uid,channelId});
  });
  socket.on('webrtc-signal',payload=>{
    const to=cleanString(payload?.to,80),data=payload?.data; if(!to||data==null||to===uid)return;
    let allowed=false;
    for(const room of voiceRooms.values()){ if(room.has(uid)&&room.has(to)){allowed=true;break;} }
    if(!allowed)return;
    io.to(`user:${to}`).emit('webrtc-signal',{from:uid,data});
  });
  socket.on('voice-state',payload=>{
    const c=findChannel(payload?.channelId),s=findServer(c?.serverId);if(!c||!s||!member(s,uid)||banned(s,uid))return;
    const room=voiceRooms.get(c.id),entry=room?.get(uid); if(!entry)return;
    entry.muted=!!payload.muted; entry.deafened=!!payload.deafened; entry.handRaised=!!payload.handRaised;
    socket.to(`voice:${c.id}`).emit('voice-state',{userId:uid,username:socket.user.username,muted:entry.muted,deafened:entry.deafened,handRaised:entry.handRaised});
  });
  socket.on('jukebox-sync',async payload=>{
    const rk=`${uid}:jukebox`; const rb=syncBuckets.get(rk)||{at:Date.now(),count:0}; if(Date.now()-rb.at>10000){rb.at=Date.now();rb.count=0;} if(++rb.count>20)return; syncBuckets.set(rk,rb);
    const s=findServer(payload?.serverId); if(!s||!member(s,uid)||banned(s,uid))return;
    const c=findChannel(payload?.channelId); if(payload?.channelId && (!c||c.serverId!==s.id||!['voice','stage'].includes(c.type)))return;
    const state={...(payload.state||{}),channelId:c?.id||null,updatedBy:uid,updatedAt:now()}; if(JSON.stringify(state).length>7*1024*1024)return;
    let row=db.sync.find(x=>x.serverId===s.id&&x.kind==='jukebox'); if(!row){row={id:nanoid(10),serverId:s.id,kind:'jukebox',data:{}};db.sync.push(row);}
    row.data=state; row.updatedBy=uid; row.updatedAt=now(); await saveDB();
    const room=c?`voice:${c.id}`:`server:${s.id}`; socket.to(room).emit('jukebox-sync',state);
  });
  socket.on('watch2-sync',async payload=>{
    const rk=`${uid}:watch2`; const rb=syncBuckets.get(rk)||{at:Date.now(),count:0}; if(Date.now()-rb.at>10000){rb.at=Date.now();rb.count=0;} if(++rb.count>20)return; syncBuckets.set(rk,rb);
    const s=findServer(payload?.serverId); if(!s||!member(s,uid)||banned(s,uid))return;
    const c=findChannel(payload?.channelId); if(payload?.channelId && (!c||c.serverId!==s.id||!['voice','stage'].includes(c.type)))return;
    const state={...(payload.state||{}),channelId:c?.id||null,updatedBy:uid,updatedAt:now()}; if(JSON.stringify(state).length>7*1024*1024)return;
    let row=db.sync.find(x=>x.serverId===s.id&&x.kind==='watch2'); if(!row){row={id:nanoid(10),serverId:s.id,kind:'watch2',data:{}};db.sync.push(row);}
    row.data=state; row.updatedBy=uid; row.updatedAt=now(); await saveDB();
    const room=c?`voice:${c.id}`:`server:${s.id}`; socket.to(room).emit('watch2-sync',state);
  });
  socket.on('jukebox-progress',payload=>{const s=findServer(payload?.serverId),c=findChannel(payload?.channelId);if(!s||!c||c.serverId!==s.id||!['voice','stage'].includes(c.type)||!member(s,uid)||banned(s,uid)||!Number.isFinite(Number(payload.elapsed)))return;socket.to(`voice:${c.id}`).emit('jukebox-progress',{channelId:c.id,elapsed:Math.max(0,Number(payload.elapsed))});});
  socket.on('watch2-progress',payload=>{const s=findServer(payload?.serverId),c=findChannel(payload?.channelId);if(!s||!c||c.serverId!==s.id||!['voice','stage'].includes(c.type)||!member(s,uid)||banned(s,uid)||!Number.isFinite(Number(payload.elapsed)))return;socket.to(`voice:${c.id}`).emit('watch2-progress',{channelId:c.id,elapsed:Math.max(0,Number(payload.elapsed))});});
  socket.on('disconnect',()=>{
    for(const [channelId,room] of voiceRooms){
      if(room.has(uid)){ room.delete(uid); if(!room.size)voiceRooms.delete(channelId); else socket.to(`voice:${channelId}`).emit('voice-peer-left',{userId:uid,channelId}); }
    }
  });
  socket.on('soundboard-play',payload=>{const s=findServer(payload?.serverId);if(s&&member(s,uid)&&!banned(s,uid))socket.to(`server:${s.id}`).emit('soundboard-play',{soundId:payload.soundId,userId:uid});});
});

app.use((err,req,res,_next)=>{console.error(err);if(res.headersSent)return;res.status(500).json({error:'Erro interno do servidor.'});});
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
server.listen(PORT,'0.0.0.0',()=>console.log(`ChronoCord server v${PLATFORM_VERSION} (protocol ${PROTOCOL_VERSION}) rodando na porta ${PORT}`));
