import { APP_CONFIG } from './config.js';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getTheme() {
  return localStorage.getItem(APP_CONFIG.storageKeys.theme) || APP_CONFIG.defaultTheme;
}

export function setTheme(theme) {
  localStorage.setItem(APP_CONFIG.storageKeys.theme, theme);
}

export function getLocalePreference() {
  return localStorage.getItem(APP_CONFIG.storageKeys.locale) || APP_CONFIG.defaultLocale;
}

export function setLocalePreference(locale) {
  localStorage.setItem(APP_CONFIG.storageKeys.locale, locale);
}

export function getCurrentUserId() {
  return localStorage.getItem(APP_CONFIG.storageKeys.sessionUserId) || '';
}

export function setCurrentUserId(userId) {
  if (!userId) {
    localStorage.removeItem(APP_CONFIG.storageKeys.sessionUserId);
    return;
  }
  localStorage.setItem(APP_CONFIG.storageKeys.sessionUserId, userId);
}

export function clearSessionState() {
  localStorage.removeItem(APP_CONFIG.storageKeys.sessionUserId);
  localStorage.removeItem(APP_CONFIG.storageKeys.bookingDraft);
}

export function clearBookingDraft() {
  localStorage.removeItem(APP_CONFIG.storageKeys.bookingDraft);
}

export function getBookingDraft() {
  return readJson(APP_CONFIG.storageKeys.bookingDraft, null);
}

export function setBookingDraft(draft) {
  if (!draft) {
    localStorage.removeItem(APP_CONFIG.storageKeys.bookingDraft);
    return;
  }
  writeJson(APP_CONFIG.storageKeys.bookingDraft, draft);
}

export function isNotificationsOpen() {
  return localStorage.getItem(APP_CONFIG.storageKeys.notificationsOpen) === 'true';
}

export function setNotificationsOpen(value) {
  localStorage.setItem(APP_CONFIG.storageKeys.notificationsOpen, String(Boolean(value)));
}
