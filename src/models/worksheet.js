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

export function operandSettings(design, name) {
  const constraint = design.canvasItems?.find(item => item.type === 'operand' && item.value === name)?.constraint
  if (constraint) return constraint
  if (design.operands && Object.hasOwn(design.operands, name)) return design.operands[name]
  return name === 'B' ? design.b || design.a : design.a
}

function defaultElements(operator) {
  return [
    { id: 'operand-a', type: 'operand', value: 'A', x: 20, y: 50 },
    { id: 'operator', type: 'operator', value: operator, x: 50, y: 50 },
    { id: 'operand-b', type: 'operand', value: 'B', x: 80, y: 50 },
  ]
}

function makeElement(item, design) {
  if (item.type === 'operand') return new Operand({ ...item, constraint: item.constraint || operandSettings(design, item.value) })
  if (item.type === 'operator') return new Operator(item)
  return new StyleItem(item)
}

function operandLabel(position) {
  let label = ''
  while (position > 0) {
    position--
    label = String.fromCharCode(65 + position % 26) + label
    position = Math.floor(position / 26)
  }
  return label
}

export class ProblemTemplate {
  constructor({ canvasItems, a, b, operands, ...design } = initialDesign) {
    const { name, operator, style, rule, grade, tags, operandFont, canvasWidth, nextOperandNumber } = design
    Object.assign(this, { name, operator, style, rule, grade, tags, operandFont, canvasWidth, nextOperandNumber })
    this.canvasItems = (canvasItems || defaultElements(design.operator || '+'))
      .map(item => item instanceof Operand || item instanceof Operator || item instanceof StyleItem
        ? item
        : makeElement(item, { a, b, operands }))
    this.expressionEdited = design.expressionEdited ?? (design.rule !== this.layoutExpression())
  }

  with(patch) {
    return new ProblemTemplate({ ...this, ...patch })
  }

  layoutExpression(elements = this.canvasItems) {
    return elements.filter(item => item instanceof Operand || item instanceof Operator)
      .sort((left, right) => left.x - right.x)
      .map(item => item.value).join(' ')
  }

  withElements(elements) {
    return this.with({ canvasItems: elements, rule: this.expressionEdited ? this.rule : this.layoutExpression(elements) })
  }

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

  layout(canvasWidth, canvasHeight) {
    return { items: this.canvasItems, canvasWidth: canvasWidth || this.canvasWidth || 700, canvasHeight: canvasHeight || 420 }
  }

  generateInstances(count, layout = this.layout()) {
    const operands = this.canvasItems.filter(item => item instanceof Operand)
    if (operands.length < 2) throw new Error('Add at least two operands to the problem canvas.')
    const referenced = SolutionSolver.operandNames(this.rule)
    const missing = operands.filter(item => !referenced.has(item.value)).map(item => item.value)
    if (missing.length) throw new Error('Expression order is missing ' + missing.join(', ') + '.')
    return Array.from({ length: count }, () => this.generateInstance(operands, layout))
  }

  generateInstance(operands, layout) {
    const values = Object.fromEntries(operands.map(operand => [operand.value, operand.regenerate()]))
    const problem = new ProblemInstance({ values }, this.rule, layout)
    return problem.withAnswer()
  }

  toJSON() {
    return { ...this, version: 2 }
  }

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

export class ProblemInstance {
  constructor({ values, a, b, answer, expression, layout }, rule, defaultLayout) {
    this.values = values || { A: a, B: b }
    this.expression = expression || rule
    this.answer = answer
    this.layout = layout || defaultLayout
  }

  solve() {
    return SolutionSolver.solve(this.expression, this.values)
  }

  withAnswer(values = this.values) {
    const instance = new ProblemInstance({ ...this, values })
    instance.answer = instance.solve()
    return instance
  }

  toRecord(defaultLayout, defaultRule) {
    const { values, answer, layout, expression } = this
    return {
      values, answer,
      ...(layout !== defaultLayout && { layout }),
      ...(expression !== defaultRule && { expression }),
    }
  }
}

export class Worksheet {
  constructor(template, problems, layout) {
    this.template = template
    this.problems = problems
    this.layout = layout
  }

  static generate(template, count, layout = template.layout()) {
    return new Worksheet(template, template.generateInstances(count, layout), layout)
  }

  static fromItem(item) {
    const template = item.design ? new ProblemTemplate(item.design) : ProblemTemplate.fromCatalog(item)
    const layout = Array.isArray(item.layout) ? item.layout : { ...template.layout(), ...item.layout }
    if (!item.problems) return Worksheet.generate(template, item.count, layout)
    const problems = item.problems.map(problem => new ProblemInstance(problem, template.rule, layout))
    return new Worksheet(template, problems, layout)
  }

  get answerKey() {
    return SolutionSolver.fromProblems(this.problems)
  }

  changeOperand(index, name, value) {
    const problem = this.problems[index]
    const operand = this.template.canvasItems.find(item => item instanceof Operand && item.value === name)
    const settings = operand || new Operand({ constraint: operandSettings(this.template, name) })
    const nextValue = value === undefined ? settings.regenerate(problem.values[name]) : Number(value)
    const problems = [...this.problems]
    problems[index] = problem.withAnswer({ ...problem.values, [name]: nextValue })
    return new Worksheet(this.template, problems, this.layout)
  }

  withPresentation(template) {
    return new Worksheet(template, this.problems, this.layout)
  }

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
export function solve(rule, a, b) { return solveExpression(rule, { A: a, B: b }) }
export function drawOperand(config, previous) { return new OperandConstraint(config).draw(previous) }
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
