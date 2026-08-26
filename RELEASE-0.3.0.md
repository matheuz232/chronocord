# ChronoCord 0.3.0

## Conectividade e robustez
- health check com retry, timeout e fallback `/`;
- reconexão Socket.IO com backoff;
- diagnóstico de conexão mais claro na tela de login;
- CORS compatível com o cliente desktop e WebSocket;
- endpoints `/health` e `/api/health`;
- versão cliente/servidor alinhada em 0.3.0.

## Build
- Electron 38.0.0; Vite 6.3.5; esbuild 0.25.9;
- updater não bloqueia a geração do instalador quando o repositório ainda não foi configurado;
- dependências do updater são instaladas automaticamente durante `npm run dist`.
