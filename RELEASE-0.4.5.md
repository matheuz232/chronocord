# ChronoCord 0.4.5

Correção de conexão Socket.IO para desktop: o cliente Electron usa WebSocket diretamente, evitando o fluxo de polling que estava falhando com `xhr poll error`. O servidor mantém WebSocket e polling habilitados para compatibilidade com outros clientes.
