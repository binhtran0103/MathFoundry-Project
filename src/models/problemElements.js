export const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' }

const operations = {
  // Adds the two operands.
  '+': (left, right) => left + right,
  // Subtracts the right operand from the left.
  '-': (left, right) => left - right,
  // Multiplies the two operands.
  '*': (left, right) => left * right,
  // Divides the operands and rejects a zero divisor.
  '/': (left, right) => {
    if (right === 0) throw new Error('Division by zero. Change the divisor or its range.')
    return left / right
  },
  // Raises the left operand to the right operand's power.
  '^': (left, right) => left ** right,
}

// Provides shared position, size, and value fields for canvas items.
export class ProblemElement {
  // Initializes the common fields for a concrete canvas item.
  constructor({ id, value, x, y, width, height }) {
    if (new.target === ProblemElement) throw new TypeError('Use a concrete problem element.')
    this.id = id
    this.value = value
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  // Copies the element with the supplied changes.
  with(patch) {
    return new this.constructor({ ...this, ...patch })
  }

  // Returns the value shown on the canvas.
  get label() {
    return this.value
  }
}

// Defines how an operand gets its value.
export class OperandConstraint {
  // Initializes the fixed value or random range settings.
  constructor({ mode = 'random', min = 10, max = 99, multiple = 1, value = 24 } = {}) {
    Object.assign(this, { mode, min, max, multiple, value })
  }

  // Returns a fixed value or draws a valid random multiple.
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

// Represents an operand and its value constraints on the canvas.
export class Operand extends ProblemElement {
  type = 'operand'

  // Creates a canvas operand with its generation settings.
  constructor({ constraint, ...element }) {
    super(element)
    this.constraint = new OperandConstraint(constraint)
  }

  // Draws a value using the operand's constraints.
  regenerate(previous) {
    return this.constraint.draw(previous)
  }

  // Copies the operand with updated generation settings.
  withSettings(patch) {
    return this.with({ constraint: { ...this.constraint, ...patch } })
  }
}

// Represents an arithmetic operator on the canvas.
export class Operator extends ProblemElement {
  type = 'operator'

  // Returns the display symbol for the operator.
  get label() {
    return Object.hasOwn(symbols, this.value) ? symbols[this.value] : this.value
  }

  // Applies the requested arithmetic operation to two operands.
  static execute(symbol, left, right) {
    return operations[symbol](left, right)
  }
}

// Represents a style marker, answer space, or divider on the canvas.
export class StyleItem extends ProblemElement {
  // Initializes a canvas item with its presentation type.
  constructor({ type = 'style', ...element }) {
    super(element)
    this.type = type
  }

  // Returns the label for the presentation item.
  get label() {
    if (this.type === 'bar') return '—'
    return this.value
  }
}
