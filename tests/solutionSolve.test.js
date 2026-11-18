import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SolutionSolver } from '../src/models/solution.js';

describe('SolutionSolver.solve(rule, operands)', () => {
  it('Operator precedence: evaluates multiplication before addition', () => {
    const result = SolutionSolver.solve('A + B * C', { A: 2, B: 3, C: 4 });

    assert.strictEqual(result, 14);
  });

  it('Parentheses and right-associative exponentiation: evaluates (1 + 2) * 2^(3^2) = 1536', () => {
    const result = SolutionSolver.solve('(A + B) * 2 ^ 3 ^ 2', { A: 1, B: 2 });

    assert.strictEqual(result, 1536);
  });

  it('Division by zero boundary: throws error when dividing by zero', () => {
    assert.throws(
      () => SolutionSolver.solve('A / B', { A: 5, B: 0 }),
      {
        message: 'Division by zero. Change the divisor or its range.',
      }
    );
  });

  it('Incomplete expression: throws error when expression ends with a trailing operator', () => {
    assert.throws(
      () => SolutionSolver.solve('A +', { A: 5 }),
      {
        message: 'Complete the solution expression.',
      }
    );
  });
});