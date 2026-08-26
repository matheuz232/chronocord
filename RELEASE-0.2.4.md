# ChronoCord 0.2.4

## Voz / palco
- Tela de voz em tela cheia inspirada no layout de chamadas modernas.
- Participantes identificados por avatar, nome, câmera/tela, microfone e áudio.
- Barra inferior de controles somente com ícones.
- Botão de tela cheia e saída segura com Esc.

## YouTube
- Player YouTube/YouTube NoCookie com `enablejsapi`, `origin` e `referrerPolicy`.
- Electron agora serve a aplicação por localhost HTTPS-like HTTP origin (127.0.0.1) em vez de `file://`.
- Requisições do player recebem Referer/Origin local para evitar o erro 153 causado por origem/referrer ausente em webviews locais.
- Vídeos que tenham incorporação desativada pelo proprietário continuam sujeitos às regras do YouTube.

## Estabilidade
- CSP e servidor local com proteção contra path traversal.
- Navegação externa continua bloqueada dentro da janela.
