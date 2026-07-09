import { DEFAULT_PREFERENCES } from "../data/constants.js?v=20260709-admin5";

const STORAGE_KEYS = {
  savedGames: "changal.savedGames",
  preferences: "changal.preferences",
  lastFilters: "changal.lastFilters"
};

const canUseStorage = () => {
  try {
    const testKey = "__changal_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const memoryStore = new Map();

function readJson(key, fallback) {
  try {
    const raw = canUseStorage() ? window.localStorage.getItem(key) : memoryStore.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  const raw = JSON.stringify(value);
  if (canUseStorage()) {
    window.localStorage.setItem(key, raw);
    return;
  }
  memoryStore.set(key, raw);
}

export function getSavedGameIds() {
  return readJson(STORAGE_KEYS.savedGames, []);
}

export function saveGameIds(ids) {
  writeJson(STORAGE_KEYS.savedGames, [...new Set(ids)]);
}

export function toggleSavedGame(id) {
  const current = new Set(getSavedGameIds());
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  const next = [...current];
  saveGameIds(next);
  return next;
}

export function getPreferences() {
  return {
    ...DEFAULT_PREFERENCES,
    ...readJson(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES)
  };
}

export function savePreferences(preferences) {
  const next = { ...DEFAULT_PREFERENCES, ...preferences };
  writeJson(STORAGE_KEYS.preferences, next);
  return next;
}

export function getLastFilters(fallback) {
  return readJson(STORAGE_KEYS.lastFilters, fallback);
}

export function saveLastFilters(filters) {
  writeJson(STORAGE_KEYS.lastFilters, filters);
}
