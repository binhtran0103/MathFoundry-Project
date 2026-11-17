import OperandIdForm from './components/OperandIdForm.jsx'
import Icon from './components/Icon.jsx'
import { symbols } from '../models/worksheet.js'

// Renders the problem canvas, palette, and selected object settings.
export default function ProblemEditorView({ controller }) {
  const { design, title, setTitle, selectedObject, dragPreview, canvasRef, canvasItems, setExpression,
    addOperand, addOperator, selectCanvasItem, renameOperand, updateOperandSettings, beginCanvasDrag,
    beginPaletteDrag, updateSelectedObject, resizeAnswerObject, removeCanvasItem } = controller

  // Renders the problem canvas and its object palette.
  function renderProblemEditor() {
    return <div className="problem-builder">
      <div className="expression-card">
        <div><strong>Expression Order</strong><small>Use every operand label and an operator between operands.</small></div>
        <input aria-label="Expression Order" value={design.rule} onChange={event => setExpression(event.target.value)} placeholder="A + B + C"/>
      </div>
      <div className="builder-section-label">PROBLEM CANVAS</div>
      <p className="canvas-help">Drag an Operator onto the canvas or click it to fill the next gap. Then choose the operation under Selected Object.</p>
      <div className="canvas-scroll" role="region" aria-label="Problem canvas" tabIndex={0}>
        <div ref={canvasRef} className="problem-canvas freeform-canvas" style={{ width: design.canvasWidth }}>
          {canvasItems.map(item => <button
            key={item.id}
            className={'canvas-object ' + item.type + '-object' + (selectedObject === item.id ? ' selected' : '')}
            style={{ left: item.x + '%', top: item.y + '%', width: item.width, height: item.height }}
            aria-label={item.type === 'operand' ? 'Operand ' + item.value : item.type === 'operator' ? 'Operator ' + item.label : item.label}
            aria-pressed={selectedObject === item.id}
            data-canvas-id={item.id}
            onPointerDown={event => beginCanvasDrag(event, item)}
            onClick={event => { if (event.detail === 0) selectCanvasItem(item.id) }}
            onContextMenu={event => { event.preventDefault(); removeCanvasItem(item.id) }}
          >
            {item.type === 'operand' ? <span className="canvas-operand-id" title={item.value}>{item.value}</span> : item.type === 'bar' ? null : item.label}
            {item.type === 'operand' && <small>Operand</small>}
          </button>)}
        </div>
      </div>
      <div className="builder-palette">
        <button className="add-operand" onClick={addOperand}><Icon name="plus" size={16}/>Add operand</button>
        <button onClick={addOperator} onPointerDown={event => {
          const button = event.currentTarget
          if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId)
          beginPaletteDrag(event, 'operator')
        }}>
          Operator
        </button>
        <button onPointerDown={event => beginPaletteDrag(event, 'answer:Answer')}>Answer<small>Blank space</small></button>
        <button onPointerDown={event => beginPaletteDrag(event, 'bar:—')}>Horizontal bar<small>Divider</small></button>
      </div>
      {dragPreview && <div className="canvas-drag-ghost" style={{ left: dragPreview.x, top: dragPreview.y }}>{dragPreview.label}</div>}
    </div>
  }

  // Renders controls for an operand's label and generation settings.
  function renderOperandSettings(operand) {
    const { id, value: name, constraint: config } = operand
    return <div className="operand-settings active-operand"><OperandIdForm key={id + ':' + name} operand={operand} renameOperand={renameOperand}/><div className="operand-header"><strong><span>{name}</span> Operand {name}</strong><select aria-label={`Operand ${name} generation mode`} value={config.mode} onChange={e => updateOperandSettings(id,{ mode:e.target.value })}><option value="random">Random</option><option value="fixed">Manual</option></select></div>{config.mode === 'fixed' ? <label>Value<input type="number" value={config.value} onChange={e => updateOperandSettings(id,{ value:e.target.value })}/></label> : <><div className="input-row"><label>Minimum<input type="number" value={config.min} onChange={e => updateOperandSettings(id,{ min:e.target.value })}/></label><label>Maximum<input type="number" value={config.max} onChange={e => updateOperandSettings(id,{ max:e.target.value })}/></label></div><label>Number constraint<select value={config.multiple} onChange={e => updateOperandSettings(id,{ multiple:Number(e.target.value) })}><option value={1}>Any integer</option><option value={10}>Multiples of 10</option><option value={100}>Multiples of 100</option><option value={5}>Multiples of 5</option><option value={12}>Multiples of 12</option></select></label></>}</div>
  }
  // Shows the settings for the selected canvas object.
  function renderSelectedObjectSettings() {
    const item = canvasItems.find(object => object.id === selectedObject)
    if (!item) return <p className="selection-hint">Select one canvas object to edit its settings.</p>
    if (item.type === 'operand') return renderOperandSettings(item)
    if (item.type === 'operator') return <label>Operator<select value={item.value} onChange={e => updateSelectedObject(e.target.value)}>{Object.entries(symbols).map(([operator,symbol]) => <option key={operator} value={operator}>{symbol}</option>)}</select></label>
    if (item.type === 'answer') return <><p className="selection-hint">This box becomes blank writing space on the worksheet.</p><div className="input-row"><label>Width<input aria-label="Answer space width" type="number" min="40" max="600" value={item.width} onChange={e => resizeAnswerObject('width',e.target.value)}/></label><label>Height<input aria-label="Answer space height" type="number" min="40" max="400" value={item.height} onChange={e => resizeAnswerObject('height',e.target.value)}/></label></div></>
    if (item.type === 'bar') return <><p className="selection-hint">A visual divider only; it does not affect the expression.</p><label>Bar width<input aria-label="Divider width" type="number" min="40" max="600" value={item.width} onChange={e => resizeAnswerObject('width',e.target.value)}/></label></>
    return <label>Display style<select value={item.value} onChange={e => updateSelectedObject(e.target.value)}>{[['horizontal','Horizontal'],['vertical','Stacked'],['division','Long division'],['radical','Radical']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
  }

  return <>
    <section className="settings-panel">
      <div className="panel-heading"><Icon name="pen"/><h2>Problem designer</h2></div>
      <label>Worksheet title<input value={title} maxLength={80} onChange={e => setTitle(e.target.value)}/></label>
      <div className="selected-object-card"><div className="builder-section-label">SELECTED OBJECT</div>{renderSelectedObjectSettings()}{selectedObject && <button className="text-button" onClick={() => removeCanvasItem(selectedObject)}>Remove selected object</button>}</div>
    </section>
    <section className="preview-panel editor-stage">
      <div className="preview-toolbar"><span><i/>PROBLEM EDITOR</span><span>Drag to arrange · overlaps are blocked</span></div>
      {renderProblemEditor()}
    </section>
  </>
}
