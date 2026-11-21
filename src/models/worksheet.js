import { Operand, OperandConstraint, Operator, StyleItem } from './problemElements.js'
import { SolutionSolver } from './solution.js'

export { symbols } from './problemElements.js'
export { AnswerKey, SolutionSolver } from './solution.js'

export const initialDesign = {
  name: 'Two-digit addition',
  operator: '+',
  style: 'horizontal',
  rule: 'A + B',
  grade: 'Grade 3',
  tags: 'addition, place value',
  a: { mode: 'random', min: 10, max: 99, multiple: 1, value: 24 },
  b: { mode: 'random', min: 10, max: 99, multiple: 1, value: 18 },
}

// Looks up an operand's generation settings in current or legacy design data.
export function operandSettings(design, name) {
  const constraint = design.canvasItems?.find(item => item.type === 'operand' && item.value === name)?.constraint
  let settings = constraint
  if (!settings) {
    settings = design.operands && Object.hasOwn(design.operands, name)
      ? design.operands[name]
      : (name === 'B' && design.b) || design.a
  }
  return settings
}

// Creates the starting canvas elements for an operator.
function defaultElements(operator) {
  return [
    { id: 'operand-a', type: 'operand', value: 'A', x: 20, y: 50 },
    { id: 'operator', type: 'operator', value: operator, x: 50, y: 50 },
    { id: 'operand-b', type: 'operand', value: 'B', x: 80, y: 50 },
  ]
}

// Restores a saved canvas item as its corresponding model.
function makeElement(item, design) {
  let element
  if (item.type === 'operand') {
    element = new Operand({ ...item, constraint: item.constraint || operandSettings(design, item.value) })
  } else if (item.type === 'operator') {
    element = new Operator(item)
  } else {
    element = new StyleItem(item)
  }
  return element
}

// Converts an operand position into an alphabetical label.
function operandLabel(position) {
  let label = ''
  while (position > 0) {
    position--
    label = String.fromCharCode(65 + position % 26) + label
    position = Math.floor(position / 26)
  }
  return label
}

// Stores the canvas layout and rules for generating problems.
export class ProblemTemplate {
  // Initializes a design and restores its canvas elements.
  constructor({ canvasItems, a, b, operands, ...design } = initialDesign) {
    const { name, operator, style, rule, grade, tags, operandFont, canvasWidth, nextOperandNumber } = design
    Object.assign(this, { name, operator, style, rule, grade, tags, operandFont, canvasWidth, nextOperandNumber })
    this.canvasItems = (canvasItems || defaultElements(design.operator || '+'))
      .map(item => item instanceof Operand || item instanceof Operator || item instanceof StyleItem
        ? item
        : makeElement(item, { a, b, operands }))
    this.expressionEdited = design.expressionEdited ?? (design.rule !== this.layoutExpression())
  }

  // Copies the template with the supplied changes.
  with(patch) {
    return new ProblemTemplate({ ...this, ...patch })
  }

  // Builds an expression from operands and operators in canvas order.
  layoutExpression(elements = this.canvasItems) {
    return elements.filter(item => item instanceof Operand || item instanceof Operator)
      .sort((left, right) => left.x - right.x)
      .map(item => item.value).join(' ')
  }

  // Updates canvas elements and refreshes the automatic expression.
  withElements(elements) {
    return this.with({ canvasItems: elements, rule: this.expressionEdited ? this.rule : this.layoutExpression(elements) })
  }

  // Validates a new operand label and updates the template expression.
  renameOperand(id, input) {
    const operand = this.canvasItems.find(item => item instanceof Operand && item.id === id)
    if (!operand) throw new Error('Select an operand to edit its ID.')
    const name = input.trim()
    if (!/^[A-Z][A-Z0-9]*$/i.test(name)) throw new Error('Start with a letter and use only letters and digits.')
    const next = name.toUpperCase()
    let template = this
    if (next !== operand.value) {
      if (this.canvasItems.some(item => item instanceof Operand && item.value === next)) {
        throw new Error('That operand ID is already in use.')
      }
      template = this.with({
        canvasItems: this.canvasItems.map(item => item === operand ? operand.with({ value: next }) : item),
        rule: SolutionSolver.renameOperand(this.rule, operand.value, next),
      })
    }
    return template
  }

  // Adds an operand with an unused label and expands the canvas if needed.
  appendOperand(width) {
    const used = new Set(this.canvasItems.filter(item => item instanceof Operand).map(item => item.value))
    let position = this.nextOperandNumber || 1
    while (used.has(operandLabel(position))) position++
    const rightEdge = this.canvasItems.reduce((right, item) => {
      const itemWidth = item.width ?? (item instanceof Operand ? 72 : item instanceof Operator ? 48 : 108)
      return Math.max(right, item.x * width / 100 + itemWidth / 2)
    }, 0)
    const center = rightEdge + 120
    const nextWidth = Math.max(width, Math.ceil(center + 52))
    const existing = nextWidth === width ? this.canvasItems :
      this.canvasItems.map(item => item.with({ x: item.x * width / nextWidth }))
    const operand = new Operand({
      id: crypto.randomUUID(), value: operandLabel(position), x: center / nextWidth * 100, y: 50,
    })
    return this.withElements([...existing, operand]).with({
      canvasWidth: nextWidth === width ? this.canvasWidth : nextWidth,
      nextOperandNumber: position + 1,
    })
  }

  // Returns the canvas items and dimensions used to display problems.
  layout(canvasWidth, canvasHeight) {
    return { items: this.canvasItems, canvasWidth: canvasWidth || this.canvasWidth || 700, canvasHeight: canvasHeight || 420 }
  }

  // Validates the operands and generates the requested number of problems.
  generateInstances(count, layout = this.layout()) {
    const operands = this.canvasItems.filter(item => item instanceof Operand)
    if (operands.length < 2) throw new Error('Add at least two operands to the problem canvas.')
    const referenced = SolutionSolver.operandNames(this.rule)
    const missing = operands.filter(item => !referenced.has(item.value)).map(item => item.value)
    if (missing.length) throw new Error('Expression order is missing ' + missing.join(', ') + '.')
    return Array.from({ length: count }, () => this.generateInstance(operands, layout))
  }

  // Draws operand values and calculates the answer for one problem.
  generateInstance(operands, layout) {
    const values = Object.fromEntries(operands.map(operand => [operand.value, operand.regenerate()]))
    const problem = new ProblemInstance({ values }, this.rule, layout)
    return problem.withAnswer()
  }

  // Returns the versioned data used to save a template.
  toJSON() {
    return { ...this, version: 2 }
  }

  // Creates a template with operand settings suited to the catalog item.
  static fromCatalog(item) {
    const { operator, name, grade, tags } = item
    const a = { ...initialDesign.a }
    const b = { ...initialDesign.b }
    const ranges = {
      '*': [{ min: 2, max: 12 }, { min: 2, max: 12 }],
      '-': [{ min: 50, max: 99 }, { min: 1, max: 49 }],
      '/': [{ min: 12, max: 120, multiple: 12 }, { mode: 'fixed', value: 12 }],
      '^': [{ mode: 'fixed', value: 10 }, { min: 1, max: 4 }],
    }
    const [left, right] = Object.hasOwn(ranges, operator) ? ranges[operator] : []
    Object.assign(a, left)
    Object.assign(b, right)
    return new ProblemTemplate({ ...initialDesign, name, grade, tags, operator, rule: ['A', operator, 'B'].join(' '), a, b })
  }
}

// Represents one problem with its values, expression, answer, and layout.
export class ProblemInstance {
  // Initializes a problem using saved values and any default layout or rule.
  constructor({ values, a, b, answer, expression, layout }, rule, defaultLayout) {
    this.values = values || { A: a, B: b }
    this.expression = expression || rule
    this.answer = answer
    this.layout = layout || defaultLayout
  }

  // Evaluates the problem's expression with its current operand values.
  solve() {
    return SolutionSolver.solve(this.expression, this.values)
  }

  // Copies the problem and calculates its answer.
  withAnswer(values = this.values) {
    const instance = new ProblemInstance({ ...this, values })
    instance.answer = instance.solve()
    return instance
  }

  // Formats the problem for storage and omits shared defaults.
  toRecord(defaultLayout, defaultRule) {
    const { values, answer, layout, expression } = this
    return {
      values, answer,
      ...(layout !== defaultLayout && { layout }),
      ...(expression !== defaultRule && { expression }),
    }
  }
}

// Groups a template, its generated problems, and their shared layout.
export class Worksheet {
  // Stores the template, problems, and layout for the worksheet.
  constructor(template, problems, layout) {
    this.template = template
    this.problems = problems
    this.layout = layout
  }

  // Creates a worksheet with the requested number of problems.
  static generate(template, count, layout = template.layout()) {
    return new Worksheet(template, template.generateInstances(count, layout), layout)
  }

  // Restores a saved worksheet or generates one from a catalog item.
  static fromItem(item) {
    const template = item.design ? new ProblemTemplate(item.design) : ProblemTemplate.fromCatalog(item)
    const layout = Array.isArray(item.layout) ? item.layout : { ...template.layout(), ...item.layout }
    let worksheet
    if (item.problems) {
      const problems = item.problems.map(problem => new ProblemInstance(problem, template.rule, layout))
      worksheet = new Worksheet(template, problems, layout)
    } else {
      worksheet = Worksheet.generate(template, item.count, layout)
    }
    return worksheet
  }

  // Builds the answer key from the worksheet's problems.
  get answerKey() {
    return SolutionSolver.fromProblems(this.problems)
  }

  // Edits or rerolls an operand and recalculates the affected answer.
  changeOperand(index, name, value) {
    const problem = this.problems[index]
    const operand = this.template.canvasItems.find(item => item instanceof Operand && item.value === name)
    const settings = operand || new Operand({ constraint: operandSettings(this.template, name) })
    const nextValue = value === undefined ? settings.regenerate(problem.values[name]) : Number(value)
    const problems = [...this.problems]
    problems[index] = problem.withAnswer({ ...problem.values, [name]: nextValue })
    return new Worksheet(this.template, problems, this.layout)
  }

  // Applies an updated template to the existing problems and layout.
  withPresentation(template) {
    return new Worksheet(template, this.problems, this.layout)
  }

  // Updates the operand label across the template, problems, and layouts.
  renameOperand(id, input) {
    const template = this.template.renameOperand(id, input)
    let worksheet = this
    if (template !== this.template) {
      const previous = this.template.canvasItems.find(item => item.id === id).value
      const next = template.canvasItems.find(item => item.id === id).value
      const layouts = new Map()
      // Updates an operand label in a layout and reuses the result for shared layouts.
      const renameLayout = layout => {
        if (!layouts.has(layout)) {
          const items = Array.isArray(layout) ? layout : layout.items
          const renamed = items === this.template.canvasItems ? template.canvasItems : items?.map(item =>
            item.type === 'operand' && item.value === previous ? { ...item, value: next } : item)
          layouts.set(layout, Array.isArray(layout) ? renamed : { ...layout, items: renamed })
        }
        return layouts.get(layout)
      }
      const problems = this.problems.map(problem => {
        const values = { ...problem.values }
        if (Object.hasOwn(values, previous)) {
          values[next] = values[previous]
          delete values[previous]
        }
        return new ProblemInstance({
          ...problem, values, layout: renameLayout(problem.layout),
          expression: SolutionSolver.renameOperand(problem.expression, previous, next),
        })
      })
      worksheet = new Worksheet(template, problems, renameLayout(this.layout))
    }
    return worksheet
  }

  // Validates the problems and builds a record for the library.
  toItem({ title, kind }) {
    const { template, problems, layout } = this
    for (const problem of problems) problem.solve()
    const { grade, tags, operator } = template
    const { canvasWidth, canvasHeight, items } = layout
    const sharedLayout = items === template.canvasItems
      ? { canvasWidth, canvasHeight }
      : layout
    return {
      id: crypto.randomUUID(), name: title, title, kind, grade, tags, operator,
      design: template.toJSON(), count: problems.length, layout: sharedLayout,
      problems: problems.map(problem => problem.toRecord(layout, template.rule)),
      date: new Date().toLocaleDateString(), color: 'sage', popularity: 0,
    }
  }
}

// Preserve the math entry points used by existing consumers and older saved work.
export const solveExpression = SolutionSolver.solve
// Evaluates a rule with the legacy A and B inputs.
export function solve(rule, a, b) { return solveExpression(rule, { A: a, B: b }) }
// Draws a value from the supplied operand settings.
export function drawOperand(config, previous) { return new OperandConstraint(config).draw(previous) }
// Generates legacy A and B value pairs and checks their solution rule.
export function generate(design, count) {
  const left = new OperandConstraint(operandSettings(design, 'A'))
  const right = new OperandConstraint(operandSettings(design, 'B'))
  return Array.from({ length: count }, () => {
    const a = left.draw()
    const b = right.draw()
    solve(design.rule, a, b)
    return { a, b }
  })
}
