# ChronoCord 1.0.1

- Corrige crash ao abrir Mensagens diretas sem conversa selecionada.
- Sincroniza a lista real de amigos ao autenticar.
- Adiciona salvar perfil explícito para avatar, banner e dados do perfil.
- Corrige captura de tela no Electron com `setDisplayMediaRequestHandler`.
- Melhora câmera e compartilhamento de tela em chamadas WebRTC.
- Jukebox agora abre automaticamente a área de vídeo para conteúdo de vídeo e evita autoplay não confiável.
- Watch2Chronos evita autoplay bloqueado e permite iniciar o vídeo pelo botão de reprodução.
- Player do YouTube recebe `widget_referrer` e política de referrer compatível com o requisito atual do player.
- Updater passa a suportar diretamente GitHub Releases + checksum SHA-256.
- GitHub Actions publica instaladores e checksums automaticamente em tags `chronocord-v*`.
