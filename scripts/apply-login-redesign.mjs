import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src', 'ChronoCord.jsx');

const source = fs.readFileSync(sourcePath, 'utf8');
if (source.includes('cc-login-redesign-v1')) {
  console.log('Login redesign already applied.');
  process.exit(0);
}

const start = source.indexOf('{!authUser && (');
const end = source.indexOf('      {authUser && (', start);
if (start < 0 || end < 0 || end <= start) {
  throw new Error('Patch não encontrado: bloco de autenticação.');
}

const login = `{/* cc-login-redesign-v1 */}\n      {!authUser && (\n        <div className="cc-login-shell">\n          <div className="cc-login-atmosphere cc-login-atmosphere-a" />\n          <div className="cc-login-atmosphere cc-login-atmosphere-b" />\n          <div className="cc-login-card">\n            <div className="cc-login-brand">\n              <div className="cc-login-logo-wrap">\n                <img className="cc-login-logo" src="/chronocord-logo.svg" alt="ChronoCord" />\n              </div>\n              <div>\n                <div className="cc-login-brand-name">CHRONOCORD</div>\n                <div className="cc-login-brand-sub">Discord shape · Chronos soul</div>\n              </div>\n            </div>\n\n            <div className="cc-login-heading">{authMode === "login" ? "Welcome back" : "Create your account"}</div>\n            <div className="cc-login-copy">{authMode === "login" ? "Entre no seu espaço e continue de onde parou." : "Crie sua conta e comece a usar o ChronoCord."}</div>\n\n            <div className="cc-login-fields">\n              <label className="cc-login-field">\n                <span className="cc-login-field-icon">@</span>\n                <input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} autoComplete={authMode === "login" ? "username" : "username"} placeholder="Nome de usuário ou e-mail" />\n              </label>\n              <label className="cc-login-field">\n                <span className="cc-login-field-icon">⌑</span>\n                <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAuth()} autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="Senha" />\n              </label>\n            </div>\n\n            {authMode === "login" && (\n              <label className="cc-login-remember">\n                <input type="checkbox" checked={rememberLogin} onChange={async (e) => { setRememberLogin(e.target.checked); if (!e.target.checked) { try { await window.electronAPI?.clearSavedLogin?.(); } catch {} } }} />\n                <span>Lembrar usuário e senha neste computador</span>\n              </label>\n            )}\n\n            {authError && <div className="cc-login-error">{authError}</div>}\n\n            <button className="cc-login-primary" onClick={submitAuth} disabled={authLoading}>\n              {authLoading ? "Conectando…" : authMode === "login" ? "Continuar com login" : "Criar conta"}\n            </button>\n\n            <div className="cc-login-divider"><span />ou<span /></div>\n\n            <button className="cc-login-secondary" type="button" onClick={() => { setAuthError(""); setAuthMode((m) => m === "login" ? "register" : "login"); }}>\n              <span className="cc-login-google-mark">G</span>\n              {authMode === "login" ? "Continuar com cadastro" : "Voltar para o login"}\n            </button>\n\n            <div className="cc-login-footer">\n              {authMode === "login" ? <>Não tem uma conta? <button type="button" onClick={() => { setAuthError(""); setAuthMode("register"); }}>Sign Up</button></> : <>Já tem uma conta? <button type="button" onClick={() => { setAuthError(""); setAuthMode("login"); }}>Entrar</button></>}\n            </div>\n          </div>\n        </div>\n      )}\n\n`;

fs.writeFileSync(sourcePath, source.slice(0, start) + login + source.slice(end), 'utf8');
console.log('Login redesign applied.');
