export function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
export function write(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
export function clear(key) { localStorage.removeItem(key) }
