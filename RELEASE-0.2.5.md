# ChronoCord 0.2.5 — build de consolidação

Esta build consolida as correções de estabilidade, segurança, mídia e distribuição automática.

## Consumidor
- servidor embutido: `https://chronocord-server.onrender.com`
- sem campo de endereço de servidor na tela de login
- tela de voz em grade estilo Discord
- controles de call somente por ícones
- Jukebox e Watch2Chronos separados
- YouTube via origem HTTP local do Electron, `youtube-nocookie`, `origin` e `Referer`
- volume/mute/play/pause/seek/next para mídia
- updater externo instalado junto ao ChronoCord
- verificação SHA-256 antes de executar instalador
- updater só aceita manifesto do repositório configurado
- Electron com contextIsolation, sandbox, nodeIntegration desativado e webSecurity ativo

## Antes do primeiro release
Edite `release-config.json` com seu usuário/organização e repositório GitHub. O script de build grava a URL do manifesto no updater antes de gerar o instalador.
