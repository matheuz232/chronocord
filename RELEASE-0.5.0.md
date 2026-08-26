# ChronoCord 0.5.0

## Voz / tempo real
- Socket.IO do Electron movido para o processo principal via IPC.
- O renderer não depende mais de CORS/WebSocket do Chromium para a conexão oficial.
- Reconexão automática, timeout e propagação de erros de transporte.
- Entrada em canal de voz independente da permissão do microfone.
- Cliente e servidor com versão alinhada em 0.5.0.
