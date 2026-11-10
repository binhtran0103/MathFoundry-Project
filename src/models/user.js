import { Worksheet } from './worksheet.js'

export class User {
  constructor({ id, name, email }, library) {
    Object.assign(this, { id, name, email, library })
  }

  openSavedWork(id) {
    const item = this.library.find(entry => entry.id === id)
    return item && Worksheet.fromItem(item)
  }

  browserWorkToImport(items) {
    const savedIds = new Set(this.library.map(item => item.id))
    return items.filter(item => !savedIds.has(item.id))
  }
}
