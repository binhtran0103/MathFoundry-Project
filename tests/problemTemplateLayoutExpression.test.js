import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Operand, Operator, StyleItem } from '../src/models/problemElements.js';
import { ProblemTemplate } from '../src/models/worksheet.js';

// Builds an expression from canvas operands and operators in left-to-right order.
// This lets the editor derive the solution expression from the canvas layout.
describe('ProblemTemplate.layoutExpression(elements)', () => {
  const template = new ProblemTemplate();

  // Unsorted elements. Supply B at x=80, A at x=20, and + at x=50, in that order.
  // Expect "A + B" and the original array order of B, A, +.
  it('Unsorted elements: sorts by x position without changing the input array', () => {
    const operandB = new Operand({ value: 'B', x: 80 });
    const operandA = new Operand({ value: 'A', x: 20 });
    const plus = new Operator({ value: '+', x: 50 });
    const elements = [operandB, operandA, plus];

    const result = template.layoutExpression(elements);
    const expected = 'A + B';
    const expectedOrder = [operandB, operandA, plus];

    assert.strictEqual(result, expected);
    assert.deepStrictEqual(elements, expectedOrder);
  });

  // Multiple operators. Supply A, +, B, *, C at x=10, 30, 50, 70, 90.
  // Expect "A + B * C".
  it('Multiple operators: includes both operators in canvas order', () => {
    const elements = [
      new Operand({ value: 'A', x: 10 }),
      new Operator({ value: '+', x: 30 }),
      new Operand({ value: 'B', x: 50 }),
      new Operator({ value: '*', x: 70 }),
      new Operand({ value: 'C', x: 90 }),
    ];

    const result = template.layoutExpression(elements);
    const expected = 'A + B * C';

    assert.strictEqual(result, expected);
  });

  // Non-arithmetic objects. Supply A, an answer space, +, a divider, and B.
  // Expect "A + B", with the answer space and divider omitted.
  it('Non-arithmetic objects: includes only operands and operators', () => {
    const elements = [
      new Operand({ value: 'A', x: 10 }),
      new StyleItem({ type: 'answer', value: 'Answer', x: 30 }),
      new Operator({ value: '+', x: 50 }),
      new StyleItem({ type: 'bar', value: '-', x: 70 }),
      new Operand({ value: 'B', x: 90 }),
    ];

    const result = template.layoutExpression(elements);
    const expected = 'A + B';

    assert.strictEqual(result, expected);
  });

  // Empty input boundary. Supply an empty elements array.
  // Expect an empty string.
  it('Empty input boundary: returns an empty string', () => {
    const result = template.layoutExpression([]);
    const expected = '';

    assert.strictEqual(result, expected);
  });
});
