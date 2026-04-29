import { APP_CONFIG } from './config.js';
import { getLocalePreference, setLocalePreference } from './state.js';

let activeLocale = APP_CONFIG.defaultLocale;
let translations = {};

export async function loadLocale(locale = getLocalePreference()) {
  const safeLocale = APP_CONFIG.supportedLocales.includes(locale) ? locale : APP_CONFIG.defaultLocale;
  const response = await fetch(`/locales/${safeLocale}.json`);
  translations = await response.json();
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
