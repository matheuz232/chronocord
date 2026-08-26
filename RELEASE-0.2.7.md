# ChronoCord 0.2.7

## Correção de conexão com o servidor

- Corrigido o CORS do backend para aceitar a origem HTTP de loopback usada pelo Electron (`127.0.0.1`/`localhost` em qualquer porta).
- Corrigido o CORS do Socket.IO com a mesma regra.
- Atualizado `/health` e `/` para reportarem a versão 0.2.7.
- Adicionado health check `/health` ao Blueprint do Render.
- Fixado Node 22 no Blueprint para reduzir variações de runtime.

O problema aparecia porque a interface desktop é carregada por um servidor local do Electron; a origem inclui uma porta dinâmica, enquanto o servidor anterior só permitia `localhost:5173`/`127.0.0.1:5173`.
