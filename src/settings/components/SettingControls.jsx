import React from 'react';

export function SettingSection({ route, title, description, children, className = '' }) {
  return (
    <section data-settings-route={route} className={`cc-settings-section ${className}`.trim()}>
      <div className="cc-settings-section-head">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function SettingRow({ label, description, children, disabled = false, vertical = false }) {
  return (
    <div className={`cc-setting-row${vertical ? ' is-vertical' : ''}${disabled ? ' is-disabled' : ''}`}>
      <div className="cc-setting-copy">
        <div className="cc-setting-label">{label}</div>
        {description && <div className="cc-setting-description">{description}</div>}
      </div>
      <div className="cc-setting-control">{children}</div>
    </div>
  );
}

export function SettingToggle({ checked, onChange, disabled = false, ariaLabel }) {
  return (
    <button
      type="button"
      className={`cc-setting-toggle${checked ? ' is-on' : ''}`}
      role="switch"
      aria-checked={!!checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <span />
    </button>
  );
}

export function SettingRadio({ checked, onChange, label, description, disabled = false, name }) {
  return (
    <label className={`cc-setting-radio${disabled ? ' is-disabled' : ''}`}>
      <input type="radio" name={name} checked={!!checked} disabled={disabled} onChange={() => onChange?.()} />
      <span className="cc-setting-radio-dot" />
      <span className="cc-setting-radio-copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

export function SettingSelect({ value, onChange, options, ariaLabel, disabled = false }) {
  return (
    <select className="cc-setting-select" value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} aria-label={ariaLabel} disabled={disabled}>
      {(options || []).map((option) => {
        const item = typeof option === 'string' ? { value: option, label: option } : option;
        return <option key={item.value} value={item.value}>{item.label}</option>;
      })}
    </select>
  );
}

export function SettingRange({ value, onChange, min = 0, max = 100, step = 1, ariaLabel, marks }) {
  return (
    <div className="cc-setting-range-wrap">
      {marks && <div className="cc-setting-range-marks">{marks.map((mark) => <span key={mark}>{mark}</span>)}</div>}
      <input className="cc-setting-range" type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange?.(Number(event.target.value))} aria-label={ariaLabel} />
    </div>
  );
}

export function SettingCard({ title, description, children, className = '' }) {
  return (
    <div className={`cc-setting-card ${className}`.trim()}>
      {(title || description) && <div className="cc-setting-card-head"><div><strong>{title}</strong>{description && <p>{description}</p>}</div></div>}
      {children}
    </div>
  );
}

export function RelatedSettingCard({ title, description, onClick, icon = '›' }) {
  return (
    <button type="button" className="cc-related-card" onClick={onClick}>
      <span className="cc-related-icon">{icon}</span>
      <span className="cc-related-copy"><strong>{title}</strong>{description && <small>{description}</small>}</span>
      <span className="cc-related-arrow">›</span>
    </button>
  );
}

export function ShortcutChip({ children }) {
  return <kbd className="cc-shortcut-chip">{children}</kbd>;
}

export function SettingsNotice({ children, tone = 'info' }) {
  return <div className={`cc-settings-notice is-${tone}`}>{children}</div>;
}

export function ActionButton({ children, onClick, tone = 'normal', disabled = false, type = 'button', className = '' }) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`cc-settings-button is-${tone} ${className}`.trim()}>{children}</button>;
}

export function DangerAction({ title, description, actionLabel, onClick }) {
  return (
    <div className="cc-danger-action">
      <div><strong>{title}</strong>{description && <small>{description}</small>}</div>
      <ActionButton tone="danger" onClick={onClick}>{actionLabel}</ActionButton>
    </div>
  );
}

export function InlineField({ label, value, onChange, placeholder = '', type = 'text', disabled = false, maxLength }) {
  return (
    <label className="cc-inline-field">
      {label && <span>{label}</span>}
      <input type={type} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} disabled={disabled} maxLength={maxLength} />
    </label>
  );
}

export function SettingsDialog({ open, title, description, children, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'normal', onConfirm, onClose, confirmDisabled = false }) {
  if (!open) return null;
  return (
    <div className="cc-settings-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="cc-settings-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {children}
        <div className="cc-settings-dialog-actions">
          <ActionButton onClick={onClose}>{cancelLabel}</ActionButton>
          <ActionButton tone={tone} disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</ActionButton>
        </div>
      </div>
    </div>
  );
}
