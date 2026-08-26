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
if (start < 0 || end < 0 || end <= start) throw new Error('Patch não encontrado: bloco de autenticação.');

const login = `{/* cc-login-redesign-v1 */}\n      {!authUser && (\n        <div className="cc-login-shell">\n          <div className="cc-login-atmosphere cc-login-atmosphere-a" />\n          <div className="cc-login-atmosphere cc-login-atmosphere-b" />\n          <div className="cc-login-card">\n            <div className="cc-login-brand">\n              <div className="cc-login-logo-wrap cc-login-wordmark-wrap">\n                <img className="cc-login-wordmark" src="/assets/chronocord-wordmark.svg" alt="ChronoCord" />\n              </div>\n              <div>\n                <div className="cc-login-brand-name">CHRONOCORD</div>\n                <div className="cc-login-brand-sub">Discord shape · Chronos soul</div>\n              </div>\n            </div>\n\n            <div className="cc-login-heading">{authMode === "login" ? "Welcome back" : "Create your account"}</div>\n            <div className="cc-login-copy">{authMode === "login" ? "Entre no seu espaço e continue de onde parou." : "Crie sua conta e comece a usar o ChronoCord."}</div>\n\n            <div className="cc-login-fields">\n              <label className="cc-login-field"><span className="cc-login-field-icon">@</span><input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} autoComplete="username" placeholder="Nome de usuário ou e-mail" /></label>\n              <label className="cc-login-field"><span className="cc-login-field-icon">⌑</span><input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAuth()} autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="Senha" /></label>\n            </div>\n\n            {authMode === "login" && (<label className="cc-login-remember"><input type="checkbox" checked={rememberLogin} onChange={async (e) => { setRememberLogin(e.target.checked); if (!e.target.checked) { try { await window.electronAPI?.clearSavedLogin?.(); } catch {} } }} /><span>Lembrar usuário e senha neste computador</span></label>)}\n            {authError && <div className="cc-login-error">{authError}</div>}\n            <button className="cc-login-primary" onClick={submitAuth} disabled={authLoading}>{authLoading ? "Conectando…" : authMode === "login" ? "Continuar com login" : "Criar conta"}</button>\n            <div className="cc-login-divider"><span />ou<span /></div>\n            <button className="cc-login-secondary" type="button" onClick={() => { setAuthError(""); setAuthMode((m) => m === "login" ? "register" : "login"); }}><span className="cc-login-google-mark">G</span>{authMode === "login" ? "Continuar com cadastro" : "Voltar para o login"}</button>\n            <div className="cc-login-footer">{authMode === "login" ? <>Não tem uma conta? <button type="button" onClick={() => { setAuthError(""); setAuthMode("register"); }}>Sign Up</button></> : <>Já tem uma conta? <button type="button" onClick={() => { setAuthError(""); setAuthMode("login"); }}>Entrar</button></>}</div>\n          </div>\n        </div>\n      )}\n\n`;

fs.writeFileSync(sourcePath, source.slice(0, start) + login + source.slice(end), 'utf8');
console.log('Login redesign applied.');
