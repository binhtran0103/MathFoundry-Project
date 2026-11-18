import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { OperandConstraint } from '../src/models/problemElements.js';

describe('OperandConstraint.draw(previous)', () => {
  afterEach((t) => {
    // Restore the original Math.random() implementation after each test case
    t.mock.restoreAll();
  });

  it('Fixed zero: returns 0 when in fixed mode with value = 0', () => {
    // Note: Adjust the constructor arguments to match your actual OperandConstraint definition
    const constraint = new OperandConstraint({ mode: 'fixed', value: 0 });

    assert.strictEqual(constraint.draw(), 0);
    assert.strictEqual(constraint.draw(5), 0);
  });

  it('Inclusive boundaries: returns 5 and 15 for random values of 0 and just below 1', (t) => {
    const constraint = new OperandConstraint({
      mode: 'random',
      min: 5,
      max: 15,
      multiple: 5,
    });

    // Mock Math.random() = 0 -> selects the lower bound (5)
    const randomMock = t.mock.method(Math, 'random', () => 0);
    assert.strictEqual(constraint.draw(), 5);

    // Change mock return value to just below 1 -> selects the upper bound (15)
    randomMock.mock.mockImplementation(() => 0.999999);
    assert.strictEqual(constraint.draw(), 15);
  });

  it('Single possible value: returns 10 even when previous = 10 because repeating is necessary', () => {
    const constraint = new OperandConstraint({
      mode: 'random',
      min: 10,
      max: 10,
      multiple: 5,
    });

    assert.strictEqual(constraint.draw(10), 10);
  });

  it('Repeat avoidance with wraparound: avoids repeating 15 and wraps around to 5', (t) => {
    const constraint = new OperandConstraint({
      mode: 'random',
      min: 5,
      max: 15,
      multiple: 5,
    });

    // Valid values are [5, 10, 15].
    // Force Math.random() to return 0.999999 to select 15 (which matches previous = 15).
    // Repeat avoidance should wrap around to the first value: 5.
    t.mock.method(Math, 'random', () => 0.999999);

    assert.strictEqual(constraint.draw(15), 5);
  });
});