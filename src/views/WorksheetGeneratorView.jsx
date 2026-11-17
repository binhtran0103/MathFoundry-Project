import Icon from './components/Icon.jsx'
import { symbols, operandSettings } from '../models/worksheet.js'

// Renders the worksheet generation controls and printable preview.
export default function WorksheetGeneratorView({ controller }) {
  const { design, setDesign, title, setTitle, count, setCount, problems, answerKey, canvasItems,
    answers, setAnswers, setStep, generateFromCanvas, changeOperand } = controller

  // Resolves a problem's display objects and canvas dimensions.
  function getWorksheetScene(problem) {
    const layout = problem.layout
    const items = Array.isArray(layout) ? layout : layout.items || canvasItems
    const sourceWidth = Array.isArray(layout) ? 700 : layout.canvasWidth || 700
    const sourceHeight = Array.isArray(layout) ? 420 : layout.canvasHeight || 420
    const objects = items.filter(item => item.type === 'operand' || item.type === 'operator' || item.type === 'answer' || item.type === 'bar').map(item => ({
      ...item,
      sourceWidth: ['answer','bar'].includes(item.type) ? item.width || (item.type === 'bar' ? 160 : 120) : item.type === 'operand' ? 72 : 48,
      sourceHeight: ['answer','bar'].includes(item.type) ? item.height || (item.type === 'bar' ? 4 : 56) : item.type === 'operand' ? 48 : 48,
      centerX: item.x * sourceWidth / 100,
      centerY: item.y * sourceHeight / 100,
    }))
    const { minX, maxX, minY, maxY } = objects.reduce((bounds, item) => ({
      minX: Math.min(bounds.minX, item.centerX - item.sourceWidth / 2),
      maxX: Math.max(bounds.maxX, item.centerX + item.sourceWidth / 2),
      minY: Math.min(bounds.minY, item.centerY - item.sourceHeight / 2),
      maxY: Math.max(bounds.maxY, item.centerY + item.sourceHeight / 2),
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
    const sceneWidth = Math.max(1, maxX - minX)
    const sceneHeight = Math.max(1, maxY - minY)
    return { objects, minX, minY, sceneWidth, sceneHeight }
  }

  // Renders a worksheet problem with editable operand values.
  function renderWorksheetProblem(problem, index) {
    const { objects, minX, minY, sceneWidth, sceneHeight } = worksheetScenes[index]
    const { values } = problem
    return <div className={`problem ${design.style}`} key={index}><span className="problem-number">{String(index+1).padStart(2,'0')}</span><div className="snapshot-viewport"><div className="problem-layout-snapshot" style={{ '--scene-ratio': `${sceneWidth} / ${sceneHeight}`, fontSize: operandFontSize }}>{objects.map(item => {
      const position = { left: `${(item.centerX - minX) / sceneWidth * 100}%`, top: `${(item.centerY - minY) / sceneHeight * 100}%`, width: `${item.sourceWidth / sceneWidth * 100}%`, height: `${item.sourceHeight / sceneHeight * 100}%`, '--token-font-size': `${18 / sceneWidth * 100}cqw` }
      return item.type === 'operand'
        ? <div key={item.id} className="snapshot-token snapshot-operand" style={position}><input aria-label={`Problem ${index+1} operand ${item.value}`} type="number" value={values[item.value] ?? ''} onChange={e => changeOperand(index,item.value,e.target.value)}/>{operandSettings(design,item.value)?.mode === 'random' && <button title={`Reroll operand ${item.value}`} onClick={() => changeOperand(index,item.value)}><Icon name="refresh" size={11}/></button>}</div>
        : item.type === 'operator'
          ? <span key={item.id} className="snapshot-token snapshot-operator" style={position}><span className="snapshot-operator-glyph">{symbols[item.value] || item.value}</span></span>
          : item.type === 'answer'
            ? <div key={item.id} className="snapshot-token snapshot-answer-space" style={position}>{answerKey?.answerAt(index) ?? ''}</div>
            : <div key={item.id} className="snapshot-token snapshot-bar" style={position}/>
    })}</div></div></div>
  }

  const worksheetColumns = problems.length <= 8 ? 2 : problems.length <= 16 ? 3 : problems.length <= 24 ? 4 : 5
  const worksheetRows = Math.ceil(problems.length / worksheetColumns)
  const worksheetFontSize = Math.max(9, Math.min(19, 24 - worksheetRows * 1.25))
  const worksheetScenes = problems.map(getWorksheetScene)
  let widthFit = Infinity
  let heightFit = Infinity
  worksheetScenes.forEach(({ objects, sceneWidth, sceneHeight }, index) => {
    for (const item of objects) {
      if (item.type !== 'operand') continue
      const length = String(problems[index].values[item.value] ?? '').length
      // Reserve 0.7 em per character for tabular digits, signs, and decimal points.
      const fit = Math.min(item.sourceHeight, item.sourceWidth / (0.7 * Math.max(1, length)))
      widthFit = Math.min(widthFit, fit / sceneWidth)
      heightFit = Math.min(heightFit, fit / sceneHeight)
    }
  })
  const operandFontSize = Number.isFinite(widthFit) ? `min(${widthFit * 100}cqw, ${heightFit * 100}cqh)` : undefined

  return <>
    <section className="settings-panel">
      <div className="panel-heading"><Icon name="pen"/><h2>Worksheet settings</h2></div>
      <label>Worksheet title<input value={title} maxLength={80} onChange={e => setTitle(e.target.value)}/></label>
      <label>Operand font<select value={design.operandFont || 'mono'} onChange={e => setDesign({operandFont:e.target.value})}><option value="mono">Terminal Mono</option><option value="courier">Courier</option><option value="console">Lucida Console</option><option value="serif">Book Serif</option><option value="sans">Clean Sans</option></select></label><div className="input-row"><label>Problems<select value={count} onChange={e => setCount(Number(e.target.value))}>{[6,8,12,16,20,24,30].map(n => <option key={n} value={n}>{n} problems</option>)}</select></label><label>Grade level<select value={design.grade} onChange={e => setDesign({grade:e.target.value})}>{[1,2,3,4,5,6,7,8].map(n => <option key={n}>Grade {n}</option>)}</select></label></div><label>Keywords<input value={design.tags} onChange={e => setDesign({tags:e.target.value})}/></label><button className="secondary full" onClick={generateFromCanvas}><Icon name="refresh" size={17}/>Generate fresh problems</button><div className="toggle-row"><div><strong>Answer key</strong><small>Include solutions on the sheet</small></div><button role="switch" aria-checked={answers} aria-label="Show answer key" className={`toggle ${answers ? 'on' : ''}`} onClick={() => setAnswers(!answers)}><span/></button></div><div className="instruction"><span>✦</span><p>Click a number to edit it. Use its refresh arrow to reroll just that operand.</p></div><button className="primary full" onClick={() => window.print()}><Icon name="print" size={17}/>Print / Save as PDF</button><button className="text-button full" onClick={() => setStep('design')}>Edit problem design <Icon name="arrow" size={16}/></button>
    </section>
    <section className="preview-panel worksheet-stage">
      <div className="preview-toolbar"><span><i/>LIVE PREVIEW</span><span>{problems.length} problems · Letter 8.5 × 11 in</span></div><div className={`worksheet operand-font-${design.operandFont || 'mono'}`} style={{'--problem-font': `${worksheetFontSize}px`, '--problem-rows': worksheetRows, '--problem-columns': worksheetColumns}}><div className="worksheet-brand">MATHFOUNDRY <span>{design.grade} · PRACTICE SERIES</span></div><h2>{title || 'Untitled worksheet'}</h2><p className="worksheet-instruction">{answers ? 'Answer key • Solutions shown below' : 'Take your time. Show your thinking. You’ve got this.'}</p><div className="student-line">Name <span/> Date <span/></div><div className={`worksheet-problems ${worksheetColumns > 2 ? 'three-columns' : ''}`}>{problems.map(renderWorksheetProblem)}</div><div className="worksheet-footer"><span>Small steps. Big discoveries.</span><span>MathFoundry · 1</span></div></div><div className="preview-caption"><Icon name="check" size={15}/>Worksheet problems are generated from your reusable problem design.</div>
    </section>
  </>
}
