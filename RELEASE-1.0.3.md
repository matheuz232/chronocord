# ChronoCord 1.0.3

A 1.0.3 consolida a experiência de mídia, perfis, transmissão e atualização do ChronoCord no Windows.

## Destaques

- Jukebox redesenhado com capa como fundo, cantos arredondados e fila lateral opcional.
- Mini-player persistente para manter a reprodução acessível em segundo plano.
- Watch2Chronos com prioridade sobre o Jukebox para evitar reprodução concorrente.
- Estado visual de **Transmissão pausada** em compartilhamentos de tela interrompidos.
- Perfil completo com mural, atividade, lista de desejos e widgets de jogos.
- Acesso ao perfil completo a partir do cartão resumido e interações por botão direito.
- Destaque visual de participantes durante a fala.
- Identidade visual unificada com a logo transparente oficial no app, updater e instalador.
- Updater compacto com verificação SHA-256 antes da instalação.
- Novo instalador animado 50/50 para Windows, com escolha de pasta e instalação silenciosa do payload validado.

## Arquivos para Windows

- **ChronoCord-Installer-1.0.3.exe** — recomendado para novas instalações; inclui a experiência de instalação animada.
- **ChronoCord-Setup-1.0.3.exe** — payload NSIS usado pelo updater e disponível para instalação direta.
- Os respectivos arquivos `.sha256` permitem validar a integridade dos executáveis.

## Atualização

O updater procura a release mais recente do repositório oficial, baixa `ChronoCord-Setup-*.exe`, confere o SHA-256 publicado e só então inicia a atualização.

## Compatibilidade

- Windows x64.
- Instalação por usuário, sem exigir instalação global.
- Dados locais do aplicativo são preservados durante atualizações normais.
