# ChronoCord 0.2.3 — validação e segurança

## Validações executadas neste ambiente
- `node --check server/server.js`: OK
- `node --check electron/main.cjs`: OK
- `node --check electron/preload.cjs`: OK
- `package.json`, `server/package.json` e `capacitor.config.json`: JSON válido
- busca estática por `nodeIntegration: true`, `contextIsolation: false`, `allowRunningInsecureContent: true`, `dangerouslySetInnerHTML`, `eval(` e `new Function(`: nenhum uso encontrado no código do aplicativo.

## O que foi endurecido
- Electron sem Node Integration e com Context Isolation/Sandbox.
- Navegação externa bloqueada dentro da janela principal.
- CORS configurável/restrito no backend.
- JWT com segredo obrigatório em produção.
- Rate limits HTTP e de sincronização.
- Limites de payload Socket.IO.
- Autorização de salas de voz e sinalização WebRTC.
- Sinalização WebRTC só entre usuários presentes na mesma sala.
- Estado de mídia limitado a aproximadamente 7 MB.
- Persistência atômica do `data.json`.
- Tratamento de erros de servidor sem exposição de stack trace ao cliente.

## Limitação de teste
A instalação completa das dependências com `npm install` não pôde ser concluída neste ambiente porque o acesso ao registry npm excedeu o limite de execução. Por isso não foi declarado um build Vite/Electron completo como se tivesse sido executado aqui.
