import { Operator } from './problemElements.js'

// Stores worksheet answers in problem order.
export class AnswerKey {
  // Copies the supplied answers into the key.
  constructor(solutions = []) {
    this.solutions = [...solutions]
  }

  // Returns the answer at the specified problem index.
  answerAt(index) {
    return this.solutions[index]
  }
}

// Evaluates arithmetic expressions and builds answer keys.
export class SolutionSolver extends AnswerKey {
  // Extracts the distinct operand labels from an expression.
  static operandNames(expression) {
    return new Set(expression.toUpperCase().match(/[A-Z][A-Z0-9]*/g))
  }

  // Replaces occurrences of a complete operand label.
  static renameOperand(expression, previous, next) {
    return expression.replace(/[A-Z][A-Z0-9]*/gi, token => token.toUpperCase() === previous ? next : token)
  }

  // Parses and evaluates a solution expression using the supplied operands.
  static solve(rule, operands) {
    const normalized = rule.replace(/−/g, '-').toUpperCase()
    const tokens = normalized.match(/[A-Z][A-Z0-9]*|\d+(?:\.\d+)?|[()+\-*/^]/g) || []
    if (tokens.join('') !== normalized.replace(/\s/g, '')) {
      throw new Error('Use operand labels, numbers, + − * / ^ and parentheses in the solution.')
    }
    let index = 0

    // Reads a number, operand, unary sign, or parenthesized expression.
    function atom() {
      const token = tokens[index++]
      let value
      if (token === '(') {
        value = expression()
        if (tokens[index++] !== ')') throw new Error('Check solution parentheses.')
      } else if (token === '-' || token === '+') {
        value = token === '-' ? -atom() : atom()
      } else if (token && Object.hasOwn(operands, token)) {
        value = Number(operands[token])
      } else if (token && /^\d/.test(token)) {
        value = Number(token)
      } else {
        throw new Error('Complete the solution expression.')
      }
      return value
    }

    // Evaluates exponentiation from right to left.
    function power() {
      let value = atom()
      if (tokens[index] === '^') {
        index++
        value = Operator.execute('^', value, power())
      }
      return value
    }

    // Evaluates multiplication and division.
    function term() {
      let value = power()
      while (tokens[index] === '*' || tokens[index] === '/') {
        const operator = tokens[index++]
        value = Operator.execute(operator, value, power())
      }
      return value
    }

    // Evaluates addition and subtraction.
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

  // Builds an answer key from saved or calculated answers.
  static fromProblems(problems) {
    return new SolutionSolver(problems.map(problem => problem.answer ?? problem.solve()))
  }
}
