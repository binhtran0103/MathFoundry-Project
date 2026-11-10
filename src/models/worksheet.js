export const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' }
export const initialDesign = { name: 'Two-digit addition', operator: '+', style: 'horizontal', rule: 'A + B', grade: 'Grade 3', tags: 'addition, place value', a: { mode: 'random', min: 10, max: 99, multiple: 1, value: 24 }, b: { mode: 'random', min: 10, max: 99, multiple: 1, value: 18 } }
export function drawOperand(config, previous) {
  if (config.mode === 'fixed') return Number(config.value)
  const min = Number(config.min), max = Number(config.max), step = Number(config.multiple)
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step < 1 || min > max || Math.ceil(min / step) > Math.floor(max / step)) throw new Error('Choose a valid range containing at least one multiple.')
  const start = Math.ceil(min / step), count = Math.floor(max / step) - start + 1
  let value = (start + Math.floor(Math.random() * count)) * step
  if (count > 1 && value === previous) value = (start + ((value / step - start + 1) % count)) * step
  return value
}
// A small expression parser, never eval: supports named operands and arithmetic.
export function solveExpression(rule, operands) {
  const compact = rule.replace(/\s/g, '').replace(/−/g, '-').toUpperCase()
  const tokens = compact.match(/[A-Z][A-Z0-9]*|\d+(?:\.\d+)?|[()+\-*/^]/g) || []
  if (tokens.join('') !== compact) throw new Error('Use operand labels, numbers, + − * / ^ and parentheses in the solution.')
  let index = 0
  const atom = () => {
    const token = tokens[index++]
    if (token === '(') { const result = expression(); if (tokens[index++] !== ')') throw new Error('Check solution parentheses.'); return result }
    if (token === '-') return -atom()
    if (token === '+') return atom()
    if (token && Object.hasOwn(operands, token)) return Number(operands[token])
    if (token && /^\d/.test(token)) return Number(token)
    throw new Error('Complete the solution expression.')
  }
  const power = () => { let value = atom(); if (tokens[index] === '^') { index++; value **= power() } return value }
  const term = () => { let value = power(); while (tokens[index] === '*' || tokens[index] === '/') { const op = tokens[index++], right = power(); if (op === '/' && right === 0) throw new Error('Division by zero. Change operand B or its range.'); value = op === '*' ? value * right : value / right } return value }
  const expression = () => { let value = term(); while (tokens[index] === '+' || tokens[index] === '-') { const op = tokens[index++], right = term(); value = op === '+' ? value + right : value - right } return value }
  const result = expression()
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error('Check the solution expression and operand values.')
  return Math.round(result * 10000) / 10000
}
export function solve(rule, a, b) { return solveExpression(rule, { A: a, B: b }) }
export function generate(design, count) {
  return Array.from({ length: count }, () => { const a = drawOperand(design.a), b = drawOperand(design.b); solve(design.rule, a, b); return { a, b } })
}

export function operandSettings(design, name) { return design.operands?.[name] || design[name.toLowerCase()] || design.a }
