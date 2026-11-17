import assert from 'node:assert/strict'
import test from 'node:test'
import { Operand, OperandConstraint, Operator, ProblemElement } from '../src/models/problemElements.js'
import { AnswerKey, ProblemInstance, ProblemTemplate, Worksheet, initialDesign, solveExpression } from '../src/models/worksheet.js'

// Creates a test template with fixed operands and an addition rule.
function fixedAddition(operandCount) {
  let template = new ProblemTemplate()
  for (let index = 2; index < operandCount; index++) template = template.appendOperand(template.canvasWidth || 700)
  const operands = template.canvasItems.filter(item => item instanceof Operand)
  template = template.with({
    canvasItems: template.canvasItems.map(item => item instanceof Operand
      ? item.withSettings({ mode: 'fixed', value: 1 })
      : item),
    rule: operands.map(item => item.value).join(' + '),
    expressionEdited: true,
  })
  return { template, operands }
}

test('operands are distinct elements and continue beyond Z', () => {
  const { template, operands } = fixedAddition(32)
  assert.equal(operands[25].value, 'Z')
  assert.equal(operands[26].value, 'AA')
  assert.equal(new Set(operands.map(item => item.id)).size, 32)
  assert.ok(operands.every(item => item instanceof ProblemElement && item.constraint instanceof OperandConstraint))
  assert.ok(template.canvasWidth > 700)
  assert.equal(Worksheet.generate(template, 6).answerKey.answerAt(0), 32)

  const withoutLast = template.withElements(template.canvasItems.slice(0, -1))
  const appended = withoutLast.appendOperand(template.canvasWidth)
  assert.equal(appended.canvasItems.at(-1).value, 'AG')
  assert.equal(appended.rule, template.rule)
})

test('a worksheet round trips with shared layout, operand settings, and editable instances', () => {
  const { template } = fixedAddition(28)
  const sheet = Worksheet.generate(template, 6).changeOperand(0, 'AB', 9)
  const payload = JSON.parse(JSON.stringify(sheet.toItem({ title: 'Many operands', kind: 'Worksheet' })))
  assert.equal(payload.layout.items, undefined)
  assert.ok(payload.problems.every(problem => problem.layout === undefined))

  const restored = Worksheet.fromItem(payload)
  assert.ok(restored.template.canvasItems[1] instanceof Operator)
  assert.ok(restored.template.canvasItems.at(-1) instanceof Operand)
  assert.ok(restored.problems[0] instanceof ProblemInstance)
  assert.ok(restored.answerKey instanceof AnswerKey)
  assert.equal(restored.problems[0].layout.items, restored.template.canvasItems)
  assert.equal(restored.answerKey.answerAt(0), 36)
  assert.equal(restored.answerKey.answerAt(1), 28)
  assert.equal(restored.changeOperand(0, 'AB').answerKey.answerAt(0), 28)
})

test('legacy worksheet records restore their operand settings and saved values', () => {
  const item = {
    design: {
      ...initialDesign,
      rule: 'A + B + C',
      operands: { C: { mode: 'fixed', value: 7 } },
      canvasItems: [
        { id: 'a', type: 'operand', value: 'A', x: 10, y: 50 },
        { id: 'plus-1', type: 'operator', value: '+', x: 30, y: 50 },
        { id: 'b', type: 'operand', value: 'B', x: 50, y: 50 },
        { id: 'plus-2', type: 'operator', value: '+', x: 70, y: 50 },
        { id: 'c', type: 'operand', value: 'C', x: 90, y: 50 },
      ],
    },
    problems: [{ values: { A: 2, B: 3, C: 10 }, expression: 'A + B + C', answer: 15 }],
  }
  const sheet = Worksheet.fromItem(item)
  assert.equal(sheet.template.canvasItems.at(-1).constraint.value, 7)
  assert.equal(sheet.answerKey.answerAt(0), 15)
  assert.equal(sheet.changeOperand(0, 'C').answerKey.answerAt(0), 12)

  const binary = Worksheet.fromItem({ design: initialDesign, problems: [{ a: 6, b: 8 }] })
  assert.equal(binary.answerKey.answerAt(0), 14)
})

test('expression parsing distinguishes adjacent operands from multi-letter labels', () => {
  assert.equal(solveExpression('AA + B * C ^ 2', { AA: 1, B: 2, C: 3 }), 19)
  assert.equal(solveExpression('2 ^ 3 ^ 2', {}), 512)
  assert.throws(() => solveExpression('A B + AB', { A: 1, B: 2, AB: 3 }), /operator between operands/)
  assert.throws(() => Worksheet.generate(new ProblemTemplate().appendOperand(700).with({ rule: 'A + B' }), 6), /missing C/)
})

test('renaming a worksheet operand preserves its identity, values, and answer', () => {
  const template = new ProblemTemplate().renameOperand('operand-b', 'AB').with({ rule: 'a + AB + a' })
  const sheet = Worksheet.generate(template, 6).changeOperand(0, 'A', 11)
  const renamed = sheet.renameOperand('operand-a', ' total1 ')
  assert.equal(renamed.template.rule, 'TOTAL1 + AB + TOTAL1')
  assert.equal(renamed.template.canvasItems[0].id, 'operand-a')
  assert.equal(renamed.template.canvasItems[0].constraint.min, template.canvasItems[0].constraint.min)
  assert.equal(renamed.problems[0].layout.items[0].value, 'TOTAL1')
  assert.equal(renamed.problems[0].values.TOTAL1, 11)
  assert.equal(Object.hasOwn(renamed.problems[0].values, 'A'), false)
  assert.equal(renamed.problems[0].solve(), sheet.problems[0].solve())
  const saved = JSON.parse(JSON.stringify(renamed.toItem({ title: 'Custom IDs', kind: 'Worksheet' })))
  assert.equal(Worksheet.fromItem(saved).problems[0].values.TOTAL1, 11)
  assert.throws(() => sheet.renameOperand('operand-a', 'ab'), /already in use/)
  assert.throws(() => sheet.renameOperand('operand-a', '1 total'), /Start with a letter/)
})
