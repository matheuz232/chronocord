# ChronoCord 0.4.0

## Objetivo
Revisão estrutural focada em servidores reais, voz/WebRTC, janela Electron e menus de servidor.

## Principais mudanças
- remove perfis, servidores, amigos e membros fictícios da inicialização;
- lista de servidores passa a ser autoritativa do backend após autenticação;
- menu de contexto real no botão direito do servidor;
- silenciar/reativar notificações e ocultar canais silenciados;
- sair do servidor para membros;
- acesso às configurações do servidor;
- perfil específico por servidor (apelido/avatar);
- janela Electron sem moldura nativa do Windows;
- entrada em canal de voz com confirmação do servidor;
- erros de voz explícitos em vez de estado falso de conectado;
- configuração de ICE/WebRTC fornecida pelo servidor, com suporte opcional a TURN via `RTC_ICE_SERVERS`;
- servidor 0.4.0 com endpoints de perfil por servidor e saída do servidor;
- manutenção de Jukebox/Watch2Chronos e sincronização por canal.

## Configuração opcional de TURN no Render
Defina `RTC_ICE_SERVERS` como um JSON de array. Exemplo:

```json
[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.example.com:3478","username":"usuario","credential":"senha"}]
```

Sem TURN, o cliente continua usando STUN público; para chamadas entre redes com NAT restritivo, configure um TURN próprio/confiável.
