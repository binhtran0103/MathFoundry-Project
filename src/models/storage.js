// Reads JSON from browser storage and falls back if the value is unavailable.
export function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
// Saves a value as JSON in browser storage.
export function write(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
