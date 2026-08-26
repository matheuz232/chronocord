# ChronoCord 0.2.2

## Principais mudanças
- servidor oficial embutido no cliente; não existe campo de endereço no login;
- autenticação e sessão com o backend real;
- mensagens reais, histórico, edição, exclusão, reações e pins;
- DMs reais entre amigos;
- criação/entrada/saída de servidores;
- canais reais;
- sincronização de Jukebox e Watch2Chronos;
- voz com WebRTC P2P e sinalização autenticada;
- anexos enviados como data URLs limitadas;
- perfil persistente;
- hardening do Electron;
- CORS, limites, rate limits, validações e autorização no backend;
- proteção adicional para DMs, WebRTC e sincronização;
- recuperação de fila de persistência do JSON;
- healthcheck para Render.

## Limitações conhecidas
- PostgreSQL ainda é recomendado para produção;
- Jukebox não resolve automaticamente URLs externas em um player de mídia universal;
- Watch2Chronos depende das políticas do YouTube/embeds;
- voz é P2P com STUN e pode exigir TURN para redes muito restritivas;
- Android requer `npx cap add android` no ambiente de desenvolvimento.
