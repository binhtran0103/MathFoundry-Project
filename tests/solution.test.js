import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SolutionSolver } from '../src/models/solution.js';

describe('SolutionSolver.operandNames(expression)', () => {
  it('Ordinary expression: extracts unique operand labels from a standard expression', () => {
    const result = SolutionSolver.operandNames('A + B * C');

    assert.ok(result instanceof Set);
    assert.deepStrictEqual(result, new Set(['A', 'B', 'C']));
  });

  it('Repeated labels and mixed case: normalizes case and removes duplicates', () => {
    const result = SolutionSolver.operandNames('a + A + b');

    assert.ok(result instanceof Set);
    assert.deepStrictEqual(result, new Set(['A', 'B']));
  });

  it('Multi-character labels: extracts multi-character and alphanumeric labels', () => {
    const result = SolutionSolver.operandNames('AA + TOTAL1 - B2');

    assert.ok(result instanceof Set);
    assert.deepStrictEqual(result, new Set(['AA', 'TOTAL1', 'B2']));
  });

  it('Empty expression boundary: returns an empty Set for an empty string', () => {
    const result = SolutionSolver.operandNames('');

    assert.ok(result instanceof Set);
    assert.strictEqual(result.size, 0);
    assert.deepStrictEqual(result, new Set());
  });
});