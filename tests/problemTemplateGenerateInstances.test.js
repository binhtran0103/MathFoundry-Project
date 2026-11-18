import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Operand } from '../src/models/problemElements.js';
import { ProblemInstance, ProblemTemplate } from '../src/models/worksheet.js';

// Validates the canvas operands against the solution expression, then generates
// the requested number of problems with drawn operand values and calculated answers.
// This produces ready-to-use problems from a template for a worksheet.
describe('ProblemTemplate.generateInstances(count, layout)', () => {
  // Generate multiple problems. Use fixed A=3 and B=4, rule "A + B", and count=3.
  // Expect three ProblemInstances, each with values A=3 and B=4 and answer 7.
  it('Generate multiple problems: returns three instances with the expected values and answers', () => {
    const template = new ProblemTemplate({
      rule: 'A + B',
      canvasItems: [
        new Operand({ value: 'A', x: 20, constraint: { mode: 'fixed', value: 3 } }),
        new Operand({ value: 'B', x: 80, constraint: { mode: 'fixed', value: 4 } }),
      ],
    });

    const instances = template.generateInstances(3);

    const expectedCount = 3;
    const expectedValues = { A: 3, B: 4 };
    const expectedAnswer = 7;

    assert.strictEqual(instances.length, expectedCount);
    for (const instance of instances) {
      assert.ok(instance instanceof ProblemInstance);
      assert.deepStrictEqual(instance.values, expectedValues);
      assert.strictEqual(instance.answer, expectedAnswer);
    }
  });

  // Multiple operators and precedence. Use fixed A=2, B=3, and C=4,
  // rule "A + B * C", and count=1. Expect one instance with answer 14.
  it('Multiple operators and precedence: calculates multiplication before addition', () => {
    const template = new ProblemTemplate({
      rule: 'A + B * C',
      canvasItems: [
        new Operand({ value: 'A', x: 20, constraint: { mode: 'fixed', value: 2 } }),
        new Operand({ value: 'B', x: 50, constraint: { mode: 'fixed', value: 3 } }),
        new Operand({ value: 'C', x: 80, constraint: { mode: 'fixed', value: 4 } }),
      ],
    });

    const instances = template.generateInstances(1);

    const expectedCount = 1;
    const expectedAnswer = 14;

    assert.strictEqual(instances.length, expectedCount);
    assert.strictEqual(instances[0].answer, expectedAnswer);
  });

  // Insufficient operands boundary. Use a canvas with only A, rule "A", and count=1.
  // Expect the error "Add at least two operands to the problem canvas."
  it('Insufficient operands boundary: throws when the canvas contains only one operand', () => {
    const template = new ProblemTemplate({
      rule: 'A',
      canvasItems: [new Operand({ value: 'A', x: 20, constraint: { mode: 'fixed', value: 3 } })],
    });

    const expectedMessage = 'Add at least two operands to the problem canvas.';
    let result;
    try {
      template.generateInstances(1);
    } catch (error) {
      result = error;
    }

    assert.ok(result instanceof Error, 'Expected generation to throw an error');
    assert.strictEqual(result.message, expectedMessage);
  });

  // Missing operand in expression. Use canvas operands A and B, rule "A + 1", and count=1.
  // Expect the error "Expression order is missing B."
  it('Missing operand in expression: throws when the rule omits a canvas operand', () => {
    const template = new ProblemTemplate({
      rule: 'A + 1',
      canvasItems: [
        new Operand({ value: 'A', x: 20, constraint: { mode: 'fixed', value: 3 } }),
        new Operand({ value: 'B', x: 80, constraint: { mode: 'fixed', value: 4 } }),
      ],
    });

    const expectedMessage = 'Expression order is missing B.';
    let result;
    try {
      template.generateInstances(1);
    } catch (error) {
      result = error;
    }

    assert.ok(result instanceof Error, 'Expected generation to throw an error');
    assert.strictEqual(result.message, expectedMessage);
  });
});
