import { createDefaultSettings } from './settingsDefaults.js';

export function settingsStorageKey(userId) {
  return `chronocord.settings.v2.${String(userId || 'guest')}`;
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)]));
  }
  return value;
}

export function mergeSettings(defaults, stored) {
  if (Array.isArray(defaults)) return Array.isArray(stored) ? clone(stored) : clone(defaults);
  if (!defaults || typeof defaults !== 'object') return stored === undefined ? defaults : stored;
  const source = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [key, mergeSettings(value, source[key])]),
  );
}

export function loadSettings(userId, storage = globalThis.localStorage) {
  const defaults = createDefaultSettings();
  try {
    const raw = storage?.getItem?.(settingsStorageKey(userId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return mergeSettings(defaults, parsed);
  } catch {
    return defaults;
  }
}

export function saveSettings(userId, value, storage = globalThis.localStorage) {
  storage?.setItem?.(settingsStorageKey(userId), JSON.stringify(value));
}

export function getSettingsPath(value, path) {
  return String(path || '').split('.').filter(Boolean).reduce((node, key) => node?.[key], value);
}

export function patchSettingsPath(value, path, nextValue) {
  const keys = String(path || '').split('.').filter(Boolean);
  if (!keys.length) return value;

  const root = Array.isArray(value) ? [...value] : { ...(value || {}) };
  let cursor = root;
  let sourceCursor = value || {};

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const sourceChild = sourceCursor?.[key];
    const child = Array.isArray(sourceChild) ? [...sourceChild] : { ...(sourceChild || {}) };
    cursor[key] = child;
    cursor = child;
    sourceCursor = sourceChild;
  }

  cursor[keys.at(-1)] = nextValue;
  return root;
}

export function resetSettingsSubtree(value, path) {
  const defaults = createDefaultSettings();
  const defaultValue = getSettingsPath(defaults, path);
  if (defaultValue === undefined) return value;
  return patchSettingsPath(value, path, clone(defaultValue));
}
