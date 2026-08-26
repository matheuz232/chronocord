# Atualizações automáticas

O cliente 1.0.2 está preparado para receber atualizações por GitHub Releases.

Repositório esperado do cliente:

`matheuz232/chronocord`

Cada release deve conter:

- `ChronoCord-Setup-X.Y.Z.exe`
- `ChronoCord-Setup-X.Y.Z.exe.sha256`

Crie uma tag no formato `chronocord-vX.Y.Z`. O workflow `.github/workflows/release.yml` compila o instalador, gera o SHA-256 e publica a release.

O updater integrado verifica a release mais recente, compara a versão instalada, baixa o instalador, valida o SHA-256 e executa a atualização por cima da instalação existente.
