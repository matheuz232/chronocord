# ChronoCord 1.0.3 — Stability Release

Esta versão é dedicada a estabilidade, compatibilidade e distribuição.

## Alterações

- versão do cliente alinhada para 1.0.3;
- updater apontando para `matheuz232/chronocord` em vez do repositório do servidor;
- validação automática da configuração do release antes do build;
- workflow do GitHub Actions para compilar o instalador Windows e publicar `.exe` + SHA-256;
- encerramento do processo alvo do updater reforçado para evitar falhas de atualização por processo residual;
- branch isolada `development/1.0.3-stability` para validação antes do merge no `main`.

## Validação esperada

`npm run check` deve validar a configuração do updater, Electron, servidor e scripts.

`npm run dist` deve gerar `release/ChronoCord-Setup-1.0.3.exe`.

Uma tag `chronocord-v1.0.3` aciona a publicação automática da release.
