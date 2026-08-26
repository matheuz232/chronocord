import React from 'react';
import { createRoot } from 'react-dom/client';
import ChronoCord from './ChronoCord.jsx';
import { MediaControls } from './media-controls.jsx';
import './app.css';

class ChronoCordErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Erro inesperado na interface.' };
  }
  componentDidCatch(error, info) {
    try { console.error('[ChronoCord UI crash]', error, info); } catch {}
  }
  reset = () => this.setState({ hasError: false, message: '' });
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32, boxSizing: 'border-box', background: '#0e0c18', color: '#f7f4ff', fontFamily: "Inter, sans-serif" }}>
        <div style={{ width: 'min(620px, 100%)', padding: 28, borderRadius: 18, border: '1px solid #2c2544', background: '#151228', boxShadow: '0 30px 90px rgba(0,0,0,.45)', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>O ChronoCord encontrou um problema</div>
          <div style={{ color: '#b5aec7', fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>A interface foi isolada para evitar que o aplicativo inteiro seja encerrado.</div>
          <div style={{ padding: 12, borderRadius: 10, background: '#0b0a11', color: '#ffb8b8', fontSize: 12, fontFamily: 'monospace', textAlign: 'left', overflow: 'auto', marginBottom: 18 }}>{this.state.message}</div>
          <button onClick={this.reset} style={{ border: 0, borderRadius: 10, padding: '10px 16px', background: '#9b4dff', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Recarregar interface</button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <ChronoCordErrorBoundary>
    <>
      <ChronoCord />
      <MediaControls />
    </>
  </ChronoCordErrorBoundary>
);
