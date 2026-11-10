import { Operator } from './problemElements.js'

export class AnswerKey {
  constructor(solutions = []) {
    this.solutions = [...solutions]
  }

  answerAt(index) {
    return this.solutions[index]
  }
}

export class SolutionSolver extends AnswerKey {
  static operandNames(expression) {
    return new Set(expression.toUpperCase().match(/[A-Z][A-Z0-9]*/g))
  }

  static solve(rule, operands) {
    const normalized = rule.replace(/−/g, '-').toUpperCase()
    const tokens = normalized.match(/[A-Z][A-Z0-9]*|\d+(?:\.\d+)?|[()+\-*/^]/g) || []
    if (tokens.join('') !== normalized.replace(/\s/g, '')) {
      throw new Error('Use operand labels, numbers, + − * / ^ and parentheses in the solution.')
    }
    let index = 0

    function atom() {
      const token = tokens[index++]
      if (token === '(') {
        const result = expression()
        if (tokens[index++] !== ')') throw new Error('Check solution parentheses.')
        return result
      }
      if (token === '-') return -atom()
      if (token === '+') return atom()
      if (token && Object.hasOwn(operands, token)) return Number(operands[token])
      if (token && /^\d/.test(token)) return Number(token)
      throw new Error('Complete the solution expression.')
    }

    function power() {
      const base = atom()
      if (tokens[index] !== '^') return base
      index++
      return Operator.execute('^', base, power())
    }

    function term() {
      let value = power()
      while (tokens[index] === '*' || tokens[index] === '/') {
        const operator = tokens[index++]
        value = Operator.execute(operator, value, power())
      }
      return value
    }

    function expression() {
      let value = term()
      while (tokens[index] === '+' || tokens[index] === '-') {
        const operator = tokens[index++]
        value = Operator.execute(operator, value, term())
      }
      return value
    }

    const result = expression()
    if (index !== tokens.length) throw new Error('Check the expression. Use an operator between operands.')
    if (!Number.isFinite(result)) {
      throw new Error('Check the solution expression and operand values.')
    }
    return Math.abs(result) < Number.MAX_VALUE / 10000 ? Math.round(result * 10000) / 10000 : result
  }

  static fromProblems(problems) {
    return new SolutionSolver(problems.map(problem => problem.answer ?? problem.solve()))
  }
}
