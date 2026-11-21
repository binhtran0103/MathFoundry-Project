// Reads JSON from browser storage and falls back if the value is unavailable.
export function read(key, fallback) {
  let value
  try {
    value = JSON.parse(localStorage.getItem(key))
  } catch {
    value = fallback
  }
  return value ?? fallback
}
// Saves a value as JSON in browser storage.
export function write(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
