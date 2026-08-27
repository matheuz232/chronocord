# ChronoCord 1.0.3

A 1.0.3 consolida a experiência de mídia, perfis, transmissão, configurações, instalação e atualização do ChronoCord no Windows.

## Destaques

- Jukebox redesenhado com capa como fundo, cantos arredondados e fila lateral opcional.
- Mini-player persistente para manter a reprodução acessível em segundo plano.
- Watch2Chronos com prioridade sobre o Jukebox para evitar reprodução concorrente.
- Estado visual de **Transmissão pausada** em compartilhamentos de tela interrompidos.
- Perfil completo com mural, atividade, lista de desejos e widgets de jogos.
- Acesso ao perfil completo a partir do cartão resumido e interações por botão direito.
- Destaque visual de participantes durante a fala.
- Configurações com rolagem independente e scrollbar visível nas colunas de navegação e conteúdo.
- Identidade visual unificada com a logo transparente oficial no app, updater e instalador.
- Updater nativo compacto com verificação SHA-256 antes da instalação.
- Instalador único e animado para Windows, com escolha de pasta, progresso visual e instalação silenciosa do payload validado.
- Empacotamento otimizado sem runtimes Electron duplicados no updater ou no instalador.

## Arquivos para Windows

- **ChronoCord-Installer-1.0.3.exe** — único instalador oficial para novas instalações e atualizações.
- **ChronoCord-Installer-1.0.3.exe.sha256** — checksum SHA-256 para validação de integridade.

O `ChronoCord-Setup-1.0.3.exe` existe apenas como payload intermediário durante o build, é incorporado ao instalador final e removido antes da publicação. Ele não é distribuído como segundo instalador.

## Atualização

O updater procura a versão mais recente no canal configurado, baixa o mesmo **ChronoCord-Installer-<versão>.exe** publicado para o usuário, valida o SHA-256 e só então inicia a atualização silenciosa e relança o aplicativo.

## Segurança e tamanho

- `npm audit --audit-level=low` faz parte do CI e a 1.0.3 é publicada com **0 vulnerabilidades conhecidas pelo npm audit**.
- O CI exige exatamente um instalador primário e bloqueia builds acima de 285 MB.
- O instalador final validado fica em aproximadamente 112 MB.

## Compatibilidade

- Windows x64.
- Instalação por usuário, sem exigir instalação global.
- Dados locais do aplicativo são preservados durante atualizações normais.
