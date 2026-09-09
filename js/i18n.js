import { APP_CONFIG } from './config.js';
import { getLocalePreference, setLocalePreference } from './state.js';

let activeLocale = APP_CONFIG.defaultLocale;
let translations = {};

export async function loadLocale(locale = getLocalePreference()) {
  const safeLocale = APP_CONFIG.supportedLocales.includes(locale) ? locale : APP_CONFIG.defaultLocale;
  // Fix H-7: fetch failures (offline, missing file) must not crash bootstrap.
  // Fall back to empty translations so the app renders with key names rather
  // than showing a blank page or an unhandled rejection.
  try {
    const response = await fetch(`/locales/${safeLocale}.json`);
    if (!response.ok) {
      throw new Error(`Locale fetch failed: ${response.status}`);
    }
    translations = await response.json();
  } catch (error) {
    console.warn('[ShowBookie] Could not load locale file, falling back to key names.', error);
    translations = {};
  }
  activeLocale = safeLocale;
  setLocalePreference(safeLocale);
  return translations;
}

export function t(key, replacements = {}) {
  const base = key.split('.').reduce((value, part) => value?.[part], translations) || key;
  return Object.entries(replacements).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value),
    String(base)
  );
}

export function getActiveLocale() {
  return activeLocale;
}
