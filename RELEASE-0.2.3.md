# ChronoCord 0.2.3 — Voice, Jukebox & Watch2Chronos

## Voz
- Painel de voz inspirado no layout de referência enviado pelo usuário.
- Lista de participantes com avatar, nome e indicadores de microfone/fone.
- Perfil do participante pode ser aberto pelo avatar/nome.
- Entrada/saída de canal com lista real de participantes no Socket.IO.
- WebRTC P2P com eleição determinística do iniciador para evitar glare.
- Fila de ICE candidates para evitar perda de candidatos antes do SDP remoto.
- Microfone, mute e deafen.
- Câmera e compartilhamento de tela com renegociação WebRTC.
- Indicadores visuais de câmera, tela e mão levantada.

## Jukebox
- Separado do Watch2Chronos.
- Áudio HTML5 real.
- Vídeo HTML5 real.
- Links diretos de mídia e arquivos locais pequenos (até 5 MB).
- Links do YouTube tratados como player de vídeo incorporado.
- Play/pause, retroceder 10s, avançar 10s, próxima faixa.
- Mute/unmute e volume.
- Barra de progresso.
- Fila.
- Estado sincronizado por canal de voz e persistido no servidor.

## Watch2Chronos
- Player YouTube visível em 16:9.
- Play/pause.
- Retroceder/avançar 5s.
- Próximo/parar.
- Mute/unmute.
- Volume.
- Brilho.
- Fila.
- Estado sincronizado por canal de voz e persistido no servidor.

## Backend
- Salas de voz mantidas em memória para presença em tempo real.
- Autorização de sinalização WebRTC somente entre participantes da mesma sala.
- Estado de Jukebox/Watch2 salvo no banco JSON existente para compatibilidade.
- Socket.IO com buffer de até 8 MB para mídia sincronizada pequena.
- Estado de mídia limitado a aproximadamente 7 MB por atualização.

## Limitação conhecida
O banco atual continua sendo `data.json`. Para produção com muitos usuários, a migração para PostgreSQL continua recomendada.
