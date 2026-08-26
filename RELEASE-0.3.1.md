# ChronoCord 0.3.1

- HTTP API requests from Electron are routed through a restricted main-process bridge, eliminating renderer CORS failures against the fixed official server.
- Health probing accepts `/health`, `/api/health`, an authenticated API challenge, and the known Render root 404 as progressively weaker reachability signals.
- Socket.IO remains enabled with automatic reconnect and narrowly scoped Electron CORS response handling.
- Server/client version aligned to 0.3.1.
- No server address is exposed in the consumer UI.
