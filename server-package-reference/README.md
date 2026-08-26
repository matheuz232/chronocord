# ChronoCord Platform Server 1.0.0

Base de longo prazo do backend ChronoCord. A plataforma foi desenhada para aceitar clientes novos sem quebrar clientes anteriores:

- API/Socket.IO versionados e compatibilidade legada.
- `/health`, `/api/meta` e `/api/capabilities` para descoberta e diagnóstico.
- negociação de versão no handshake Socket.IO.
- suporte a voz/WebRTC, Jukebox e Watch2Chronos.
- persistência atômica em JSON para desenvolvimento simples, com backups automáticos e migrações de esquema.
- rate limiting e validações no servidor.
- eventos antigos continuam aceitos enquanto novas features podem ser adicionadas sem quebrar consumidores existentes.
- shutdown gracioso e recuperação de banco baseada em backups.

## Render
Build: `npm install`
Start: `npm start`
Health check: `/health`
Node: 22.x

## Variáveis recomendadas
`JWT_SECRET` — segredo aleatório com pelo menos 32 caracteres.
`CLIENT_ORIGINS` — origens HTTP que podem acessar a API.
`RTC_ICE_SERVERS` — JSON de servidores ICE/STUN/TURN para WebRTC.
`MAX_JSON` — limite de payload JSON, padrão 8mb.

## Compatibilidade
Clientes consultam `/api/meta` e `/api/capabilities`. O backend não quebra clientes antigos sem necessidade; novos recursos são anunciados como capabilities/feature flags.

## Desenvolvimento
`npm run check`
`npm run self-test`
`npm start`
