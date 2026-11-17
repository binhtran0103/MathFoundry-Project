import { Worksheet } from './worksheet.js'

// Represents a signed-in profile and its saved library.
export class User {
  // Stores the profile details and associated library.
  constructor({ id, name, email }, library) {
    Object.assign(this, { id, name, email, library })
  }

  // Finds and opens a saved item by ID.
  openSavedWork(id) {
    const item = this.library.find(entry => entry.id === id)
    return item && Worksheet.fromItem(item)
  }

  // Finds browser-saved items that are missing from the account library.
  browserWorkToImport(items) {
    const savedIds = new Set(this.library.map(item => item.id))
    return items.filter(item => !savedIds.has(item.id))
  }
}
