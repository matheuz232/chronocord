# ChronoCord 0.2.1

Esta versão consolida a base do aplicativo e do backend.

## Cliente
- servidor oficial embutido; campo de endereço removido da tela de login;
- sessão salva apenas pelo token;
- API/Socket.IO apontam para o servidor oficial;
- Electron com preload seguro e controles de janela funcionais;
- sandbox + context isolation + node integration desativado;
- CSP para limitar execução/conexões/mídia;
- reconexão e entrada automática no servidor ativo;
- versão do app atualizada para 0.2.1.

## Backend
- JWT com issuer/audience e segredo obrigatório em produção;
- rate limit de login/cadastro e de mensagens;
- CORS configurável;
- validação e limites de payload;
- autorização de rooms Socket.IO;
- autorização para canais, mensagens, reações, pins, DMs, sincronização, voz e assets;
- AutoMod de palavras bloqueadas;
- proteção de cargos e dono;
- convite com limite de usos validado;
- gravação atômica do JSON;
- limpeza correta das referências na exclusão de servidor/canal/mensagem;
- headers de segurança;
- erros internos não vazam detalhes.

## Observação
O backend permanece em `data.json` para preservar compatibilidade com a instalação atual. Para escala, alta disponibilidade e persistência independente do filesystem do Render, PostgreSQL é a próxima migração recomendada.
