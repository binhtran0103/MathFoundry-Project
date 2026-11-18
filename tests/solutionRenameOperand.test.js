import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SolutionSolver } from '../src/models/solution.js';

// Replaces every complete occurrence of an operand label in an expression.
// This keeps the expression up to date when an operand is renamed.
describe('SolutionSolver.renameOperand(expression, previous, next)', () => {
  // Repeated occurrences. Rename A to TOTAL1 in "A + B + A".
  // Expect "TOTAL1 + B + TOTAL1".
  it('Repeated occurrences: replaces every occurrence of the operand label', () => {
    const result = SolutionSolver.renameOperand('A + B + A', 'A', 'TOTAL1');
    const expected = 'TOTAL1 + B + TOTAL1';

    assert.strictEqual(result, expected);
  });

  // Similar label boundaries. Rename A to C in "A + AA + A1".
  // Expect "C + AA + A1".
  it('Similar label boundaries: matches complete operand labels', () => {
    const result = SolutionSolver.renameOperand('A + AA + A1', 'A', 'C');
    const expected = 'C + AA + A1';

    assert.strictEqual(result, expected);
  });

  // Mixed-case occurrences. Rename A to X in "a + A + B".
  // Expect "X + X + B".
  it('Mixed-case occurrences: replaces both lowercase and uppercase matches', () => {
    const result = SolutionSolver.renameOperand('a + A + B', 'A', 'X');
    const expected = 'X + X + B';

    assert.strictEqual(result, expected);
  });

  // Label absent. Rename C to X in "A + B".
  // Expect the original expression "A + B".
  it('Label absent: returns the original expression', () => {
    const result = SolutionSolver.renameOperand('A + B', 'C', 'X');
    const expected = 'A + B';

    assert.strictEqual(result, expected);
  });
});
