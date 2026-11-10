export const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' }

const operations = {
  '+': (left, right) => left + right,
  '-': (left, right) => left - right,
  '*': (left, right) => left * right,
  '/': (left, right) => {
    if (right === 0) throw new Error('Division by zero. Change the divisor or its range.')
    return left / right
  },
  '^': (left, right) => left ** right,
}

export class ProblemElement {
  constructor({ id, value, x, y, width, height }) {
    if (new.target === ProblemElement) throw new TypeError('Use a concrete problem element.')
    this.id = id
    this.value = value
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  with(patch) {
    return new this.constructor({ ...this, ...patch })
  }

  get label() {
    return this.value
  }
}

export class OperandConstraint {
  constructor({ mode = 'random', min = 10, max = 99, multiple = 1, value = 24 } = {}) {
    Object.assign(this, { mode, min, max, multiple, value })
  }

  draw(previous) {
    if (this.mode === 'fixed') return Number(this.value)
    const min = Number(this.min)
    const max = Number(this.max)
    const step = Number(this.multiple)
    const first = Math.ceil(min / step)
    const count = Math.floor(max / step) - first + 1
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step < 1 || count < 1) {
      throw new Error('Choose a valid range containing at least one multiple.')
    }
    const index = Math.floor(Math.random() * count)
    const value = (first + index) * step
    return count > 1 && value === previous ? (first + (index + 1) % count) * step : value
  }
}

export class Operand extends ProblemElement {
  type = 'operand'

  constructor({ constraint, ...element }) {
    super(element)
    this.constraint = new OperandConstraint(constraint)
  }

  regenerate(previous) {
    return this.constraint.draw(previous)
  }

  withSettings(patch) {
    return this.with({ constraint: { ...this.constraint, ...patch } })
  }
}

export class Operator extends ProblemElement {
  type = 'operator'

  get label() {
    return Object.hasOwn(symbols, this.value) ? symbols[this.value] : this.value
  }

  static execute(symbol, left, right) {
    return operations[symbol](left, right)
  }
}

export class StyleItem extends ProblemElement {
  constructor({ type = 'style', ...element }) {
    super(element)
    this.type = type
  }

  get label() {
    if (this.type === 'bar') return '—'
    return this.value
  }
}
