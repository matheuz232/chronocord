# Mídia e voz no ChronoCord 0.2.3

## Jukebox
O Jukebox é separado do Watch2Chronos.

Aceita:
- URL direta para áudio (MP3, OGG, WAV etc., conforme o navegador conseguir reproduzir);
- URL direta para vídeo;
- arquivo local pequeno, de até 5 MB;
- URL do YouTube, que é reproduzida como vídeo incorporado.

Os controles são sincronizados com quem estiver no mesmo canal de voz.

## Watch2Chronos
Use links de vídeos do YouTube. O player usa a API de comandos do iframe do YouTube para play/pause, seek, mute e volume.

O autoplay com som pode ser limitado pelas políticas de reprodução do Chromium. O primeiro play deve ser acionado pelo usuário; o botão de play do ChronoCord faz isso por gesto do usuário.

## Voz
A voz usa WebRTC P2P com Socket.IO somente para sinalização.
O servidor não transporta o áudio.

O usuário deve permitir microfone/câmera quando o sistema operacional solicitar.
