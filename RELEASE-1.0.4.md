# ChronoCord 1.0.4

Esta versão consolida as correções sociais feitas após a 1.0.3 e mantém a arquitetura otimizada do instalador único do Windows.

## Corrigido

- **Convidar pessoas no servidor:** o convite agora usa o `inviteCode` real do servidor.
- **Botão Copiar:** a cópia usa o clipboard nativo do Electron e só confirma sucesso depois que a escrita realmente termina.
- **Fallback de clipboard:** mantém uma alternativa pelo `navigator.clipboard` quando necessário.
- **Link selecionável:** o endereço do convite também pode ser selecionado e copiado manualmente.
- **Entrar por convite:** aceita tanto o código puro quanto o link completo `https://chronocord.gg/invite/<código>`.
- **Adicionar amigo:** removido o formato legado `nome#0000`; a busca é somente pelo nome de usuário.

## Windows

- Um único instalador público: `ChronoCord-Installer-1.0.4.exe`.
- Instalador nativo animado com payload interno verificado por SHA-256.
- Updater nativo, sem segundo runtime Electron.
- Limite de tamanho do instalador mantido em 285 MB.
- Instalação silenciosa real continua sendo validada no CI.

## Segurança e testes

- `npm audit --audit-level=low` continua obrigatório no pipeline.
- O teste de regressão `Social — invites and friends` cobre os convites e o fluxo de amizade corrigidos.
- Todos os testes de Settings, distribuição, updater, instalador e instalação real do Windows permanecem como gates de release.
