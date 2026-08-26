# ChronoCord Server 0.3.0

Backend real do ChronoCord. Compatível com Render, Railway, VPS ou execução local.

## Render
- Build Command: `npm install`
- Start Command: `npm start`
- Node: 18+
- Variável recomendada: `JWT_SECRET` com um segredo longo e aleatório.

A versão usa `data.json` como fallback para instalação simples. Para produção no Render, recomenda-se conectar um banco PostgreSQL antes de uso em escala.

## Endpoints principais
- Auth: `/api/register`, `/api/login`, `/api/me`
- Servidores: `/api/servers`, `/api/servers/:id`
- Canais: `/api/servers/:id/channels`
- Mensagens: `/api/channels/:id/messages`
- Reações/pins
- Membros/cargos
- Convites/banimentos/auditoria
- Emojis/figurinhas/sons/decorações
- Amigos/DMs
- Jukebox/Watch2Chronos/estado de servidor
- Socket.IO para mensagens, typing, voz/WebRTC signaling e sincronização multimídia
