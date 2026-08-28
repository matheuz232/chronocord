# ChronoCord 1.0.4

Cliente desktop React/Vite/Electron + backend Express/Socket.IO.

## Cliente

```bash
npm install
npm run dev
```

Desktop:

```bash
npm run desktop
```

Instalador Windows:

```bash
npm run dist
```

O endereço do servidor não é editável pelo usuário: o cliente usa o servidor oficial embutido em `https://chronocord-server.onrender.com`.

## Backend

```bash
cd server
npm install
npm start
```

Em produção configure `JWT_SECRET` e `CLIENT_ORIGINS`.

Veja `SECURITY-AND-TESTS.md` para as correções de segurança e limitações de validação.

## 0.3.0
A versão 0.3.0 adiciona retries/timeout de rede, reconexão Socket.IO, health check redundante e CORS compatível com o desktop.

## 1.0.0
Tema Original, Preto e Branco, com personalização persistente e sistema de animações fluídas.

## ChronoCord 1.0.0
Temas Original, Preto e Branco, motion system fluido e base alinhada ao Platform Server 1.0.0.

## ChronoCord 1.0.4
Corrige o fluxo de convite de servidores, torna a cópia de links confiável no Electron e remove o formato legado `nome#0000` ao adicionar amigos. O Windows continua sendo entregue por um único instalador nativo animado.
