import { useEffect, useRef, useState } from 'react'
import { initialDesign, symbols, drawOperand, generate, solveExpression } from './math'
import './App.css'

const Icon = ({ name, size = 20 }) => {
  const paths = { grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>, pen: <><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m13 6 5 5"/></>, book: <><path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v16h-6a4 4 0 0 0-3 1 4 4 0 0 0-3-1H3Z"/><path d="M12 6v15"/></>, folder: <path d="M3 7V4h7l2 3h9v13H3Z"/>, plus: <path d="M12 5v14M5 12h14"/>, arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, refresh: <><path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/></>, search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>, print: <><path d="M7 8V3h10v5M7 17H3V9h18v8h-4M7 14h10v7H7Z"/><path d="M17 11h1"/></>, check: <path d="m5 12 4 4L19 6"/>, star: <path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>, chevron: <path d="m9 5 7 7-7 7"/>, save: <><path d="M4 3h13l4 4v14H4Z"/><path d="M8 3v6h8V3M8 21v-8h9v8"/></>, close: <path d="m6 6 12 12M18 6 6 18"/>, download: <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>, logout: <path d="M10 4H4v16h6m0-8h11m-4-4 4 4-4 4"/> }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>
}
const examples = [
  { id: 'addition', name: 'Two-digit addition', grade: 'Grade 3', tags: 'addition, place value', operator: '+', color: 'sage', count: 12, popularity: 284, description: 'Build confidence, one sum at a time.' },
  { id: 'multiply', name: 'Multiplication practice', grade: 'Grade 4', tags: 'multiplication, times tables', operator: '*', color: 'peach', count: 20, popularity: 231, description: 'Make times tables second nature.' },
  { id: 'subtract', name: 'Subtraction explorers', grade: 'Grade 2', tags: 'subtraction, number sense', operator: '-', color: 'lavender', count: 12, popularity: 196, description: 'A little practice. A lot of progress.' },
  { id: 'divide', name: 'Division essentials', grade: 'Grade 5', tags: 'division, fluency', operator: '/', color: 'blue', count: 16, popularity: 173, description: 'Find the patterns in every quotient.' },
  { id: 'powers', name: 'Powers of ten', grade: 'Grade 5', tags: 'powers, exponents, place value', operator: '^', color: 'peach', count: 12, popularity: 128, description: 'Small numbers with big possibilities.' },
  { id: 'mixed', name: 'Mental math warm-up', grade: 'Grade 3', tags: 'addition, mental math', operator: '+', color: 'sage', count: 8, popularity: 112, description: 'Start the lesson with a little spark.' },
]
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
function operandSettings(design, name) { return design.operands?.[name] || design[name.toLowerCase()] || design.a }
function App() {
  const [page, setPage] = useState('Overview')
  const [design, setDesign] = useState(structuredClone(initialDesign))
  const [title, setTitle] = useState('Two-digit addition')
  const [count, setCount] = useState(12)
  const [problems, setProblems] = useState(() => generate(initialDesign, 12))
  const [selectedObject, setSelectedObject] = useState('operand-a')
  const [dragPreview, setDragPreview] = useState(null)
  const dragRef = useRef(null)
  const canvasRef = useRef(null)
  const [canvasItems, setCanvasItems] = useState([
    { id: 'operand-a', type: 'operand', value: 'A', x: 20, y: 50 },
    { id: 'operator', type: 'operator', value: '+', x: 50, y: 50 },
    { id: 'operand-b', type: 'operand', value: 'B', x: 80, y: 50 },
  ])
  const [expressionEdited, setExpressionEdited] = useState(false)
  const [answers, setAnswers] = useState(false)
  const [saved, setSaved] = useState(() => read('mf-saved', []))
  const [publicItems, setPublicItems] = useState(() => read('mf-public', []))
  const [profile, setProfile] = useState(() => read('mf-profile', null))
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('All grades')
  const [sort, setSort] = useState('popular')
  const [tab, setTab] = useState('Worksheets')
  const [error, setError] = useState('')
  const [publish, setPublish] = useState(false)
  const [step, setStep] = useState('design')
  const [help, setHelp] = useState(false)
  function toast(message) { setNotice(message); window.setTimeout(() => setNotice(''), 4500) }
  function navigate(next) { setPage(next); setError(''); setSearch('') }
  function useTemplate(item) {
    setExpressionEdited(false)
    setSelectedObject('operand-a')
    if (item.design) { setDesign(structuredClone(item.design)); setCanvasItems(item.design.canvasItems || [{ id: 'operand-a', type: 'operand', value: 'A', x: 20, y: 50 }, { id: 'operator', type: 'operator', value: item.design.operator || '+', x: 50, y: 50 }, { id: 'operand-b', type: 'operand', value: 'B', x: 80, y: 50 }]); setTitle(item.title || item.name); setCount(item.count); setProblems(item.problems || generate(item.design, item.count)) }
    else {
      const next = { ...structuredClone(initialDesign), name: item.name, grade: item.grade, tags: item.tags, operator: item.operator, rule: `A ${item.operator} B` }
      if (item.operator === '*') { next.a.min = 2; next.a.max = 12; next.b.min = 2; next.b.max = 12 }
      if (item.operator === '/') { next.a = { mode: 'random', min: 12, max: 120, multiple: 12, value: 24 }; next.b = { mode: 'fixed', min: 1, max: 12, multiple: 1, value: 12 } }
      if (item.operator === '-') { next.a.min = 50; next.a.max = 99; next.b.min = 1; next.b.max = 49 }
      if (item.operator === '^') { next.a = { ...next.a, mode: 'fixed', value: 10 }; next.b.min = 1; next.b.max = 4 }
      setDesign(next); setCanvasItems([{ id: 'operand-a', type: 'operand', value: 'A', x: 20, y: 50 }, { id: 'operator', type: 'operator', value: item.operator, x: 50, y: 50 }, { id: 'operand-b', type: 'operand', value: 'B', x: 80, y: 50 }]); setTitle(item.name); setCount(item.count); setProblems(generate(next, item.count))
    }
    setStep('worksheet'); setAnswers(false); navigate('Create worksheet')
  }
  function updateOperandSettings(name, patch) {
    const key = name.toLowerCase()
    setDesign(current => ['a','b'].includes(key)
      ? { ...current, [key]: { ...current[key], ...patch } }
      : { ...current, operands: { ...current.operands, [name]: { ...(current.operands?.[name] || structuredClone(current.a)), ...patch } } })
  }
  function problemExpression(items = canvasItems) {
    return items.filter(item => item.type === 'operand' || item.type === 'operator')
      .sort((a, b) => a.x - b.x)
      .map(item => item.type === 'operand' ? item.value : item.value)
      .join(' ')
  }
  function generateFromCanvas() {
    try {
      const expression = design.rule.trim() || problemExpression()
      const operands = [...new Set(canvasItems.filter(item => item.type === 'operand').map(item => item.value))]
      if (operands.length < 2) throw new Error('Add at least two operands to the problem canvas.')
      const referenced = [...expression.matchAll(/[A-Z][A-Z0-9]*/gi)].map(match => match[0].toUpperCase())
      const missing = operands.filter(name => !referenced.includes(name))
      if (missing.length) throw new Error(`Expression order is missing operand${missing.length > 1 ? 's' : ''} ${missing.join(', ')}.`)
      const canvasBounds = canvasRef.current?.getBoundingClientRect()
      const layout = { items: structuredClone(canvasItems), canvasWidth: canvasBounds?.width || 700, canvasHeight: canvasBounds?.height || 420 }
      const next = Array.from({ length: count }, () => {
        const values = Object.fromEntries(operands.map(name => [name, drawOperand(operandSettings(design, name))]))
        const answer = solveExpression(expression, values)
        return { values, a: values.A, b: values.B, answer, expression, layout }
      })
      setDesign(current => ({ ...current, rule: expression }))
      setProblems(next); setError(''); setStep('worksheet'); toast('Worksheet created from your problem layout.')
    } catch (e) { setError(e.message) }
  }
  function changeOperand(index, name, value) {
    try {
      const config = operandSettings(design, name)
      const next = problems.map((problem, i) => {
        if (i !== index) return problem
        const values = { ...(problem.values || { A: problem.a, B: problem.b }), [name]: value === undefined ? drawOperand(config, problem.values?.[name]) : Number(value) }
        return { ...problem, values, answer: solveExpression(problem.expression || design.rule, values) }
      })
      next.forEach(problem => solveExpression(problem.expression || design.rule, problem.values || { A: problem.a, B: problem.b }))
      setProblems(next); setError('')
    } catch (e) { setError(e.message) }
  }
  function commitCanvasDrop(payload, clientX, clientY) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    const movingId = payload.startsWith('move:') ? payload.slice(5) : null
    const [type, value] = movingId ? ['', ''] : payload.split(':')
    const operandId = type === 'operand' ? `operand-${value.toLowerCase()}` : null
    const operators = canvasItems.filter(item => item.type === 'operator')
    const operandCount = canvasItems.filter(item => item.type === 'operand').length
    const replacedId = movingId || canvasItems.find(item => item.id === operandId)?.id ||
      (type === 'style' ? canvasItems.find(item => item.id === 'style')?.id : null) ||
      (type === 'operator' && operators.length === 1 && operandCount <= 2 ? operators[0].id : null)
    const existingNode = replacedId && [...canvas.querySelectorAll('[data-canvas-id]')].find(node => node.dataset.canvasId === replacedId)
    const width = existingNode?.offsetWidth || (type === 'answer' ? 120 : type === 'bar' ? 160 : type === 'style' ? 108 : type === 'operator' ? 48 : 72)
    const height = existingNode?.offsetHeight || (type === 'answer' ? 56 : type === 'bar' ? 4 : type === 'style' ? 32 : 48)
    const px = Math.max(width / 2, Math.min(bounds.width - width / 2, clientX - bounds.left))
    const py = Math.max(height / 2, Math.min(bounds.height - height / 2, clientY - bounds.top))
    const collision = [...canvas.querySelectorAll('[data-canvas-id]')].some(node => {
      if (node.dataset.canvasId === replacedId) return false
      const rect = node.getBoundingClientRect()
      const dx = Math.abs(px - (rect.left - bounds.left + rect.width / 2))
      const dy = Math.abs(py - (rect.top - bounds.top + rect.height / 2))
      return dx < (width + rect.width) / 2 - 1 && dy < (height + rect.height) / 2 - 1
    })
    if (collision) { setError('That position overlaps another object. Move it to a clear space.'); return null }
    const x = (px / bounds.width) * 100
    const y = (py / bounds.height) * 100
    let nextItems = [...canvasItems]
    let selectedId = movingId
    if (movingId) {
      nextItems = nextItems.map(item => item.id === movingId ? { ...item, x, y } : item)
    } else if (type === 'operand') {
      selectedId = operandId
      if (!['A','B'].includes(value)) setDesign(current => ({ ...current, operands: { ...current.operands, [value]: current.operands?.[value] || structuredClone(current.a) } }))
      nextItems = nextItems.some(item => item.id === operandId)
        ? nextItems.map(item => item.id === operandId ? { ...item, x, y } : item)
        : [...nextItems, { id: operandId, type, value, x, y }]
    } else if (type === 'operator') {
      const currentOperators = nextItems.filter(item => item.type === 'operator')
      const currentOperandCount = nextItems.filter(item => item.type === 'operand').length
      if (currentOperators.length === 1 && currentOperandCount <= 2) {
        selectedId = currentOperators[0].id
        nextItems = nextItems.map(item => item.id === selectedId ? { ...item, value, x, y } : item)
      } else {
        selectedId = `operator-${crypto.randomUUID()}`
        nextItems = [...nextItems, { id: selectedId, type, value, x, y }]
      }
      setDesign(current => ({ ...current, operator: value }))
    } else if (type === 'style') {
      selectedId = 'style'
      setDesign(current => ({ ...current, style: value }))
      nextItems = nextItems.some(item => item.id === 'style')
        ? nextItems.map(item => item.id === 'style' ? { ...item, value, x, y } : item)
        : [...nextItems, { id: 'style', type, value, x, y }]
    } else if (type === 'answer') {
      selectedId = `answer-${crypto.randomUUID()}`
      nextItems = [...nextItems, { id: selectedId, type, value: 'Answer', x, y, width: 120, height: 56 }]
    } else if (type === 'bar') {
      selectedId = `bar-${crypto.randomUUID()}`
      nextItems = [...nextItems, { id: selectedId, type, value: 'bar', x, y, width: 160, height: 4 }]
    }
    setCanvasItems(nextItems)
    setSelectedObject(selectedId)
    if (!expressionEdited) setDesign(current => ({ ...current, rule: problemExpression(nextItems) }))
    setError('')
    return selectedId
  }
  function beginCanvasDrag(event, item) {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = { payload: `move:${item.id}`, id: item.id, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - (rect.left + rect.width / 2), offsetY: event.clientY - (rect.top + rect.height / 2), source: 'canvas', moved: false }
    setDragPreview(null)
  }
  function beginPaletteDrag(event, payload, label) {
    event.preventDefault()
    dragRef.current = { payload, startX: event.clientX, startY: event.clientY, offsetX: 0, offsetY: 0, source: 'palette', moved: false }
    setDragPreview(null)
  }
  function updateSelectedObject(value) {
    const item = canvasItems.find(object => object.id === selectedObject)
    if (!item) return
    const nextItems = canvasItems.map(object => object.id === item.id ? { ...object, value } : object)
    setCanvasItems(nextItems)
    if (item.type === 'operator') setDesign(current => ({ ...current, operator: value, ...(!expressionEdited ? { rule: problemExpression(nextItems) } : {}) }))
    if (item.type === 'style') setDesign(current => ({ ...current, style: value }))
  }
  function resizeAnswerObject(dimension, rawValue) {
    const selected = canvasItems.find(object => object.id === selectedObject && ['answer','bar'].includes(object.type))
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!selected || !bounds) return
    const value = Math.max(40, Math.min(dimension === 'width' ? bounds.width : bounds.height, Number(rawValue) || 40))
    const width = dimension === 'width' ? value : selected.width
    const height = dimension === 'height' ? value : selected.height
    const cx = selected.x * bounds.width / 100, cy = selected.y * bounds.height / 100
    const collision = canvasItems.some(item => {
      if (item.id === selected.id) return false
      const otherWidth = ['answer','bar'].includes(item.type) ? item.width : item.type === 'operand' ? 72 : item.type === 'operator' ? 48 : 108
      const otherHeight = ['answer','bar'].includes(item.type) ? item.height : item.type === 'style' ? 32 : 48
      const dx = Math.abs(cx - item.x * bounds.width / 100)
      const dy = Math.abs(cy - item.y * bounds.height / 100)
      return dx < (width + otherWidth) / 2 - 1 && dy < (height + otherHeight) / 2 - 1
    })
    if (collision) { setError('That answer box size overlaps another object. Make it smaller or move it.'); return }
    setCanvasItems(items => items.map(item => item.id === selected.id ? { ...item, [dimension]: value } : item))
    setError('')
  }
  useEffect(() => {
    const onMove = event => {
      const drag = dragRef.current
      if (!drag) return
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) drag.moved = true
      if (drag.moved) {
        const item = drag.id && canvasItems.find(object => object.id === drag.id)
        const label = item ? item.type === 'operand' ? item.value : item.type === 'operator' ? symbols[item.value] : item.type === 'answer' ? 'Answer' : item.type === 'bar' ? '—' : item.value : drag.payload.split(':')[1]
        setDragPreview({ label, x: event.clientX, y: event.clientY })
      }
    }
    const onUp = event => {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      if (!drag.moved) {
        if (drag.source === 'canvas') setSelectedObject(drag.id)
      } else {
        const bounds = canvasRef.current?.getBoundingClientRect()
        if (bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom) {
          commitCanvasDrop(drag.payload, event.clientX - drag.offsetX, event.clientY - drag.offsetY)
        }
      }
      setDragPreview(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [canvasItems, expressionEdited, design])
  function save(kind) {
    if (!title.trim()) { setError('Give your worksheet a title before saving.'); return }
    if (publish && /\b(fuck|shit|bitch|asshole)\b/i.test(`${title} ${design.tags}`)) { setError('Please use classroom-appropriate titles and keywords.'); return }
    try { problems.forEach(p => solveExpression(p.expression || design.rule, p.values || { A: p.a, B: p.b })) } catch (e) { setError(e.message); return }
    const item = { id: crypto.randomUUID(), name: title.trim(), title: title.trim(), design: { ...structuredClone(design), canvasItems: structuredClone(canvasItems) }, problems: structuredClone(problems), count: problems.length, grade: design.grade, tags: design.tags, operator: design.operator, kind, date: new Date().toLocaleDateString(), color: 'sage', popularity: 0 }
    const next = [item, ...saved]; setSaved(next); localStorage.setItem('mf-saved', JSON.stringify(next))
    if (publish) { const list = [item, ...publicItems]; setPublicItems(list); localStorage.setItem('mf-public', JSON.stringify(list)) }
    setModal(null); setPublish(false); toast(`${kind} saved${publish ? ' and added to the demo catalog' : ' to your library'}.`)
  }
  function remove(id) { const next = saved.filter(item => item.id !== id); setSaved(next); localStorage.setItem('mf-saved', JSON.stringify(next)); toast('Removed from your library.') }
  const catalog = [...publicItems, ...examples].filter(item => `${item.name} ${item.tags} ${item.grade}`.toLowerCase().includes(search.toLowerCase()) && (grade === 'All grades' || item.grade === grade) && (tab === 'Worksheets' ? item.kind !== 'Problem design' : item.kind !== 'Worksheet')).sort((a,b) => sort === 'popular' ? b.popularity-a.popularity : a.name.localeCompare(b.name))
  const navItems = [['Overview', 'grid'], ['Create worksheet', 'pen'], ['Explore catalog', 'book'], ['My library', 'folder']]
  function MiniSheet({ item }) { return <div className={`mini-sheet ${item.color}`}><div className="mini-paper"><div className="mini-title">{item.name}</div><div className="mini-line"/><div className="mini-problems">{[0,1,2,3,4,5].map((n) => <span key={n}>{item.operator === '^' ? <>10<sup>{n % 3 + 1}</sup></> : `${12+n*3} ${symbols[item.operator]} ${item.operator === '/' ? 3 : 4+n}`} = <i/></span>)}</div></div><span className="sheet-badge">{item.count} problems</span></div> }
  function Cards({ items, library = false }) { return <div className="card-grid">{items.map(item => <article className="template-card" key={item.id}><button className="card-preview" onClick={() => useTemplate(item)} aria-label={`Open ${item.name}`}><MiniSheet item={item}/></button><div className="card-body"><div className="card-meta"><span>{item.grade}</span><span>{library ? item.kind : <><Icon name="star" size={13}/> {item.popularity}</>}</span></div><button className="title-button" onClick={() => useTemplate(item)}>{item.name}</button><p>{item.description || item.tags}</p><div className="card-footer"><span>{item.tags.split(',')[0]}</span><button className="text-button" onClick={() => useTemplate(item)}>Use template <Icon name="arrow" size={16}/></button>{library && <button className="delete" onClick={() => remove(item.id)} aria-label={`Delete ${item.name}`}>×</button>}</div></div></article>)}</div> }
  function renderProblemEditor() {
    return <div className="problem-builder"><div className="expression-card"><div><strong>Expression Order</strong><small>Type the exact calculation order; every operand on the canvas must be included.</small></div><input aria-label="Expression Order" value={design.rule} onChange={e => { setDesign(current => ({ ...current, rule: e.target.value })); setExpressionEdited(true) }} placeholder="A + C - B"/></div><div className="builder-section-label">PROBLEM CANVAS</div><p className="canvas-help">Drag objects into open space. Select one object to edit it. Right-click to remove it.</p><div ref={canvasRef} className="problem-canvas freeform-canvas">{canvasItems.map(item => <button key={item.id} className={`canvas-object ${item.type}-object ${selectedObject === item.id ? 'selected' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%`, ...(['answer','bar'].includes(item.type) ? { width: item.width, height: item.height } : {}) }} data-canvas-id={item.id} onPointerDown={e => beginCanvasDrag(e,item)} onContextMenu={e => { e.preventDefault(); const next = canvasItems.filter(candidate => candidate.id !== item.id); setCanvasItems(next); if (selectedObject === item.id) setSelectedObject(''); if (!expressionEdited) setDesign(current => ({ ...current, rule: problemExpression(next) })) }}>{item.type === 'style' ? item.value[0].toUpperCase() + item.value.slice(1) : item.type === 'operator' ? symbols[item.value] : item.type === 'answer' ? 'Answer' : item.type === 'bar' ? null : <>{item.value}<small>Operand {item.value}</small></>}</button>)}</div><div className="builder-palette"><span>DRAG A PIECE TO ADD IT</span>{['A','B','C','D','E','F','G','H'].map(value => <button key={value} onPointerDown={e => beginPaletteDrag(e,`operand:${value}`,value)}>{value}<small>Operand</small></button>)}{Object.entries(symbols).map(([op,symbol]) => <button key={op} onPointerDown={e => beginPaletteDrag(e,`operator:${op}`,symbol)}>{symbol}<small>Operator</small></button>)}{[['horizontal','Horizontal'],['vertical','Stacked'],['division','Long division'],['radical','Radical']].map(([value,label]) => <button key={value} onPointerDown={e => beginPaletteDrag(e,`style:${value}`,label)}>{label}<small>Style</small></button>)}<button onPointerDown={e => beginPaletteDrag(e,'answer:new','Answer')}>Answer<small>Blank space</small></button><button onPointerDown={e => beginPaletteDrag(e,'bar:new','—')}>Horizontal bar<small>Divider</small></button></div>{dragPreview && <div className="canvas-drag-ghost" style={{ left: dragPreview.x, top: dragPreview.y }}>{dragPreview.label}</div>}</div>
  }
  function renderWorksheetProblem(problem, index) {
    const fallback = [
      { id: 'operand-a', type: 'operand', value: 'A', x: 20, y: 50 },
      { id: 'operator', type: 'operator', value: design.operator, x: 50, y: 50 },
      { id: 'operand-b', type: 'operand', value: 'B', x: 80, y: 50 },
    ]
    const layout = problem.layout || { items: fallback, canvasWidth: 700, canvasHeight: 420 }
    const items = Array.isArray(layout) ? layout : layout.items || fallback
    const sourceWidth = Array.isArray(layout) ? 700 : layout.canvasWidth || 700
    const sourceHeight = Array.isArray(layout) ? 420 : layout.canvasHeight || 420
    const objects = items.filter(item => item.type === 'operand' || item.type === 'operator' || item.type === 'answer' || item.type === 'bar').map(item => ({
      ...item,
      sourceWidth: ['answer','bar'].includes(item.type) ? item.width || (item.type === 'bar' ? 160 : 120) : item.type === 'operand' ? 72 : 48,
      sourceHeight: ['answer','bar'].includes(item.type) ? item.height || (item.type === 'bar' ? 4 : 56) : item.type === 'operand' ? 48 : 48,
      centerX: item.x * sourceWidth / 100,
      centerY: item.y * sourceHeight / 100,
    }))
    const minX = Math.min(...objects.map(item => item.centerX - item.sourceWidth / 2))
    const maxX = Math.max(...objects.map(item => item.centerX + item.sourceWidth / 2))
    const minY = Math.min(...objects.map(item => item.centerY - item.sourceHeight / 2))
    const maxY = Math.max(...objects.map(item => item.centerY + item.sourceHeight / 2))
    const sceneWidth = Math.max(1, maxX - minX)
    const sceneHeight = Math.max(1, maxY - minY)
    const values = problem.values || { A: problem.a, B: problem.b }
    return <div className={`problem ${design.style}`} key={index}><span className="problem-number">{String(index+1).padStart(2,'0')}</span><div className="snapshot-viewport"><div className="problem-layout-snapshot" style={{ '--scene-ratio': `${sceneWidth} / ${sceneHeight}` }}>{objects.map(item => {
      const position = { left: `${(item.centerX - minX) / sceneWidth * 100}%`, top: `${(item.centerY - minY) / sceneHeight * 100}%`, width: `${item.sourceWidth / sceneWidth * 100}%`, height: `${item.sourceHeight / sceneHeight * 100}%`, '--token-font-size': `${18 / sceneWidth * 100}cqw` }
      return item.type === 'operand'
        ? <div key={item.id} className="snapshot-token snapshot-operand" style={{ ...position, '--width-font': `${150 / Math.max(1, String(values[item.value] ?? '').length)}cqw` }}><input aria-label={`Problem ${index+1} operand ${item.value}`} type="number" value={values[item.value] ?? ''} onChange={e => changeOperand(index,item.value,e.target.value)}/>{operandSettings(design,item.value).mode === 'random' && <button title={`Reroll operand ${item.value}`} onClick={() => changeOperand(index,item.value)}><Icon name="refresh" size={11}/></button>}</div>
        : item.type === 'operator'
          ? <span key={item.id} className="snapshot-token snapshot-operator" style={position}><span className="snapshot-operator-glyph">{symbols[item.value] || item.value}</span></span>
          : item.type === 'answer'
            ? <div key={item.id} className="snapshot-token snapshot-answer-space" style={position}>{answers ? problem.answer ?? solveExpression(problem.expression || design.rule, values) : ''}</div>
            : <div key={item.id} className="snapshot-token snapshot-bar" style={position}/>
    })}</div></div></div>
  }
  function renderOperandSettings(name) {
    const config = operandSettings(design, name)
    return <div className="operand-settings active-operand"><div className="operand-header"><strong><span>{name}</span> Operand {name}</strong><select aria-label={`Operand ${name} generation mode`} value={config.mode} onChange={e => updateOperandSettings(name,{ mode:e.target.value })}><option value="random">Random</option><option value="fixed">Manual</option></select></div>{config.mode === 'fixed' ? <label>Value<input type="number" value={config.value} onChange={e => updateOperandSettings(name,{ value:e.target.value })}/></label> : <><div className="input-row"><label>Minimum<input type="number" value={config.min} onChange={e => updateOperandSettings(name,{ min:e.target.value })}/></label><label>Maximum<input type="number" value={config.max} onChange={e => updateOperandSettings(name,{ max:e.target.value })}/></label></div><label>Number constraint<select value={config.multiple} onChange={e => updateOperandSettings(name,{ multiple:Number(e.target.value) })}><option value={1}>Any integer</option><option value={10}>Multiples of 10</option><option value={100}>Multiples of 100</option><option value={5}>Multiples of 5</option><option value={12}>Multiples of 12</option></select></label></>}</div>
  }
  function renderSelectedObjectSettings() {
    const item = canvasItems.find(object => object.id === selectedObject)
    if (!item) return <p className="selection-hint">Select one canvas object to edit its settings.</p>
    if (item.type === 'operand') return renderOperandSettings(item.value)
    if (item.type === 'operator') return <label>Operator<select value={item.value} onChange={e => updateSelectedObject(e.target.value)}>{Object.entries(symbols).map(([operator,symbol]) => <option key={operator} value={operator}>{symbol}</option>)}</select></label>
    if (item.type === 'answer') return <><p className="selection-hint">This box becomes blank writing space on the worksheet.</p><div className="input-row"><label>Width<input aria-label="Answer space width" type="number" min="40" max="600" value={item.width} onChange={e => resizeAnswerObject('width',e.target.value)}/></label><label>Height<input aria-label="Answer space height" type="number" min="40" max="400" value={item.height} onChange={e => resizeAnswerObject('height',e.target.value)}/></label></div></>
    if (item.type === 'bar') return <><p className="selection-hint">A visual divider only; it does not affect the expression.</p><label>Bar width<input aria-label="Divider width" type="number" min="40" max="600" value={item.width} onChange={e => resizeAnswerObject('width',e.target.value)}/></label></>
    return <label>Display style<select value={item.value} onChange={e => updateSelectedObject(e.target.value)}>{[['horizontal','Horizontal'],['vertical','Stacked'],['division','Long division'],['radical','Radical']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
  }
  const worksheetColumns = problems.length <= 8 ? 2 : problems.length <= 16 ? 3 : problems.length <= 24 ? 4 : 5
  const worksheetRows = Math.ceil(problems.length / worksheetColumns)
  const worksheetFontSize = Math.max(9, Math.min(19, 24 - worksheetRows * 1.25))
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('Overview') }}><span className="brand-mark">m<span>ƒ</span></span><span>MathFoundry<span className="brand-dot">.</span></span></a><div className="workspace-label">TEACHER WORKSPACE</div><nav>{navItems.map(([label, icon]) => <button className={page === label ? 'nav-item active' : 'nav-item'} key={label} onClick={() => navigate(label)}><Icon name={icon}/>{label}{label === 'My library' && <span className="nav-count">{saved.length}</span>}</button>)}</nav><div className="sidebar-note"><span className="little-spark">✦</span><h3>Less prep.<br/>More possibilities.</h3><p>A little inspiration for your next great lesson.</p><button onClick={() => navigate('Explore catalog')}>Find your next worksheet <Icon name="arrow" size={16}/></button></div><div className="sidebar-bottom"><button className="nav-item" onClick={() => setHelp(true)}><span className="help-icon">?</span>Quick demo guide</button><button className="profile" onClick={() => setModal('profile')}><span className="avatar">{profile?.name?.slice(0,1).toUpperCase() || 'T'}</span><span><strong>{profile?.name || 'Teacher workspace'}</strong><small>{profile ? 'Local demo profile' : 'Try it. Make it yours.'}</small></span><Icon name="chevron" size={16}/></button></div></aside>
    <div className="main-shell"><header className="topbar"><div><span className="breadcrumb">Workspace</span><Icon name="chevron" size={13}/><span>{page}</span></div><div><span className="demo-label"><i/> Presentation prototype</span><button className="avatar small" onClick={() => setModal('profile')} aria-label="Open demo profile">{profile?.name?.slice(0,1).toUpperCase() || 'T'}</button></div></header>
    <main>
    {page === 'Overview' && <>
      <div className="page-heading"><div><div className="eyebrow">A FRESH PAGE STARTS HERE</div><h1>Good lessons start with you<span>.</span></h1><p>Turn your teaching ideas into worksheets that just click.</p></div><button className="primary" onClick={() => { navigate('Create worksheet'); setStep('design') }}><Icon name="plus" size={18}/>Create worksheet</button></div>
      <section className="hero-banner"><div className="hero-copy"><span className="pill"><span>✦</span> MADE FOR YOUR CLASSROOM</span><h2>Your lesson.<br/>Your numbers.<br/><em>Your worksheet.</em></h2><p>Design the problems. Set the possibilities.<br/>We’ll take care of the practice.</p><button className="primary" onClick={() => { navigate('Create worksheet'); setStep('design') }}>Let’s make something <Icon name="arrow" size={18}/></button><small>No blank-page feeling required.</small></div><div className="hero-art" aria-hidden="true"><span className="art-star">✳</span><span className="float-symbol plus-symbol">+</span><div className="hero-paper"><div className="paper-top"><span>MATHFOUNDRY / PRACTICE SERIES</span><span>№ 01</span></div><h3>A little practice.<br/>A lot of possibility.</h3><div className="paper-sub">Name __________________　 Date __________</div><div className="hero-sums"><span><small>01</small>24 + 18 = <i/></span><span><small>02</small>36 + 27 = <i/></span><span><small>03</small>52 + 16 = <i/></span><span><small>04</small>43 + 29 = <i/></span><span><small>05</small>65 + 12 = <i/></span><span><small>06</small>17 + 34 = <i/></span></div><div className="paper-foot">Big ideas begin with small steps. <span>✦</span></div></div><div className="floating-tag"><span className="check-circle"><Icon name="check" size={14}/></span> A perfect fit for your lesson</div><span className="float-symbol divide-symbol">÷</span></div></section>
      <section className="workflow-strip">{[['pen','Design your way','Custom problems. Your rules.'],['refresh','Make every sheet unique','Smart numbers, fresh practice.'],['book','Share a little inspiration','A whole community of ideas.']].map(([icon, name, desc],i) => <div key={name}><span className={`feature-icon feature-${i}`}><Icon name={icon}/></span><div><h3>{name}</h3><p>{desc}</p></div>{i < 2 && <span className="feature-divider"/>}</div>)}</section>
      <section className="featured"><div className="section-heading"><div><div className="eyebrow">A LITTLE INSPIRATION</div><h2>Ready for your next lesson</h2><p>Start with a community favorite. Make it your own.</p></div><button className="text-button" onClick={() => navigate('Explore catalog')}>Explore the catalog <Icon name="arrow" size={17}/></button></div><Cards items={examples.slice(0,3)}/></section>
      <div className="bottom-note"><span>✦</span> Thoughtfully made for the people who make a difference.</div>
    </>}
    {page === 'Create worksheet' && <>
      <div className="page-heading"><div><div className="eyebrow">FROM IDEA TO HANDOUT</div><h1>Your worksheet workshop<span>.</span></h1><p>A little structure. Endless possibilities.</p></div><button className="secondary" onClick={() => { setModal('save'); setError('') }}><Icon name="save" size={17}/>Save work</button></div>
      <div className="builder-tabs"><button className={step === 'design' ? 'selected' : ''} onClick={() => setStep('design')}><b>1</b> Design a problem</button><span>────</span><button className={step === 'worksheet' ? 'selected' : ''} onClick={() => setStep('worksheet')}><b>2</b> Make your worksheet</button><span className="auto-save-note">Your ideas, made printable.</span></div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className={`builder-layout ${step === 'design' ? 'design-mode' : 'worksheet-mode'}`}><section className="settings-panel"><div className="panel-heading"><Icon name="pen"/><h2>{step === 'design' ? 'Problem designer' : 'Worksheet settings'}</h2></div>
      <label>Worksheet title<input value={title} maxLength={80} onChange={e => setTitle(e.target.value)}/></label>
      {step === 'design' ? <>
      

      <div className="selected-object-card"><div className="builder-section-label">SELECTED OBJECT</div>{renderSelectedObjectSettings()}</div>
      </> : <><label>Operand font<select value={design.operandFont || 'mono'} onChange={e => setDesign({...design,operandFont:e.target.value})}><option value="mono">Terminal Mono</option><option value="courier">Courier</option><option value="console">Lucida Console</option><option value="serif">Book Serif</option><option value="sans">Clean Sans</option></select></label><div className="input-row"><label>Problems<select value={count} onChange={e => setCount(Number(e.target.value))}>{[6,8,12,16,20,24,30].map(n => <option key={n} value={n}>{n} problems</option>)}</select></label><label>Grade level<select value={design.grade} onChange={e => setDesign({...design,grade:e.target.value})}>{[1,2,3,4,5,6,7,8].map(n => <option key={n}>Grade {n}</option>)}</select></label></div><label>Keywords<input value={design.tags} onChange={e => setDesign({...design,tags:e.target.value})}/></label><button className="secondary full" onClick={generateFromCanvas}><Icon name="refresh" size={17}/>Generate fresh problems</button><div className="toggle-row"><div><strong>Answer key</strong><small>Include solutions on the sheet</small></div><button role="switch" aria-checked={answers} aria-label="Show answer key" className={`toggle ${answers ? 'on' : ''}`} onClick={() => setAnswers(!answers)}><span/></button></div><div className="instruction"><span>✦</span><p>Click a number to edit it. Use its refresh arrow to reroll just that operand.</p></div><button className="primary full" onClick={() => window.print()}><Icon name="print" size={17}/>Print / Save as PDF</button><button className="text-button full" onClick={() => setStep('design')}>Edit problem design <Icon name="arrow" size={16}/></button></>}
      </section><section className={`preview-panel ${step === 'design' ? 'editor-stage' : 'worksheet-stage'}`}>{step === 'design' ? <><div className="preview-toolbar"><span><i/>PROBLEM EDITOR</span><span>Drag to arrange · overlaps are blocked</span></div>{renderProblemEditor()}</> : <><div className="preview-toolbar"><span><i/>LIVE PREVIEW</span><span>{problems.length} problems · Letter 8.5 × 11 in</span></div><div className={`worksheet operand-font-${design.operandFont || 'mono'}`} style={{'--problem-font': `${worksheetFontSize}px`, '--problem-rows': worksheetRows, '--problem-columns': worksheetColumns}}><div className="worksheet-brand">MATHFOUNDRY <span>{design.grade} · PRACTICE SERIES</span></div><h2>{title || 'Untitled worksheet'}</h2><p className="worksheet-instruction">{answers ? 'Answer key • Solutions shown below' : 'Take your time. Show your thinking. You’ve got this.'}</p><div className="student-line">Name <span/> Date <span/></div><div className={`worksheet-problems ${worksheetColumns > 2 ? 'three-columns' : ''}`}>{problems.map(renderWorksheetProblem)}</div><div className="worksheet-footer"><span>Small steps. Big discoveries.</span><span>MathFoundry · 1</span></div></div><div className="preview-caption"><Icon name="check" size={15}/>Worksheet problems are generated from your reusable problem design.</div></>}</section></div>
    </>}
    {page === 'Explore catalog' && <><div className="page-heading"><div><div className="eyebrow">GOOD IDEAS ARE BETTER SHARED</div><h1>A little inspiration for every lesson<span>.</span></h1><p>Explore ready-to-use practice, then add your own teaching touch.</p></div></div><div className="catalog-controls"><div className="search-box"><Icon name="search"/><input placeholder="Search skills, topics, or keywords…" aria-label="Search catalog" value={search} onChange={e => setSearch(e.target.value)}/></div><select aria-label="Filter by grade" value={grade} onChange={e => setGrade(e.target.value)}><option>All grades</option>{[1,2,3,4,5,6,7,8].map(n => <option key={n}>Grade {n}</option>)}</select><select aria-label="Sort catalog" value={sort} onChange={e => setSort(e.target.value)}><option value="popular">Most popular</option><option value="name">Name: A–Z</option></select></div><div className="catalog-tabs">{['Worksheets','Problem designs'].map(name => <button key={name} className={tab === name ? 'selected' : ''} onClick={() => setTab(name)}>{name}</button>)}<span>{catalog.length} results</span></div><p className="demo-disclosure">Demo collection · Popularity counts are sample data. Public submissions stay in this browser.</p>{catalog.length ? <Cards items={catalog}/> : <div className="empty-state"><Icon name="search" size={34}/><h2>No matches just yet</h2><p>Try another keyword or grade level.</p><button className="secondary" onClick={() => { setSearch(''); setGrade('All grades') }}>Clear filters</button></div>}</>}
    {page === 'My library' && <><div className="page-heading"><div><div className="eyebrow">YOUR IDEAS, ALL TOGETHER</div><h1>A home for your good work<span>.</span></h1><p>Pick up where you left off. Or make something new.</p></div><button className="primary" onClick={() => navigate('Create worksheet')}><Icon name="plus" size={17}/>Create worksheet</button></div><p className="library-note"><Icon name="folder" size={17}/> Saved in this browser · {saved.length} {saved.length === 1 ? 'item' : 'items'}</p>{saved.length ? <Cards items={saved} library/> : <div className="empty-state"><div className="empty-icon"><Icon name="folder" size={38}/></div><h2>Your next great lesson belongs here.</h2><p>Save a worksheet or problem design from the workshop.<br/>It’ll be ready whenever inspiration strikes again.</p><button className="primary" onClick={() => navigate('Create worksheet')}>Make your first worksheet <Icon name="arrow" size={17}/></button></div>}</>}
    {page === 'Create worksheet' && step === 'design' && <div className="generate-dock"><button className="primary" onClick={generateFromCanvas}>Generate worksheet <Icon name="arrow" size={17}/></button></div>}</main><footer className="app-footer"><span>MathFoundry<span className="brand-dot">.</span> <span className="footer-tag">Made for the way you teach.</span></span><span>Software engineering project · Prototype</span></footer></div>
    {notice && <div className="toast" role="status"><Icon name="check" size={18}/>{notice}</div>}
    {(modal || help) && <div className="modal-backdrop" onClick={() => { setModal(null); setHelp(false) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}><button className="modal-close" aria-label="Close dialog" onClick={() => { setModal(null); setHelp(false) }}><Icon name="close"/></button>{help ? <><div className="eyebrow">YOUR PRESENTATION, SORTED</div><h2 id="modal-title">A five-minute MathFoundry demo.</h2><ol className="demo-steps"><li><strong>Start with an idea.</strong> Open the workshop or choose a catalog template.</li><li><strong>Make it yours.</strong> Set operand ranges, choose an operation, and define the solution.</li><li><strong>Generate and fine-tune.</strong> Reroll one number, manually edit another, and reveal the answers.</li><li><strong>Keep and share.</strong> Save to your library or publish to the local demo catalog.</li><li><strong>Bring it to class.</strong> Print the worksheet or choose “Save as PDF” in the print dialog.</li></ol><p className="demo-disclosure">This prototype uses browser storage. Profiles, moderation, sharing, and popularity are demonstrations; real accounts, a shared backend, and imported PDF search are future work.</p></> : modal === 'profile' ? <><div className="eyebrow">MAKE YOURSELF AT HOME</div><h2 id="modal-title">Your teacher workspace.</h2><p className="modal-intro">Set a demo profile for your presentation. Work is saved on this device.</p><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); const value = { name: data.get('name'), email: data.get('email') }; setProfile(value); localStorage.setItem('mf-profile',JSON.stringify(value)); setModal(null); toast('Your demo profile is ready.') }}><label>Your name<input name="name" required maxLength={40} defaultValue={profile?.name || ''} placeholder="Alex Morgan" autoFocus/></label><label>Email<input name="email" type="email" required defaultValue={profile?.email || ''} placeholder="alex@school.edu"/></label><button className="primary full" type="submit">Save demo profile <Icon name="arrow" size={16}/></button></form>{profile && <button className="text-button full" onClick={() => { setProfile(null); localStorage.removeItem('mf-profile'); setModal(null) }}>Clear profile</button>}<p className="demo-disclosure">Demo only. No password or real authentication.</p></> : <><div className="eyebrow">KEEP THE GOOD IDEAS</div><h2 id="modal-title">Save it for your next lesson.</h2><p className="modal-intro">“{title}” will be stored in your browser library.</p><label className="checkbox-row"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)}/><span>Add to the public demo catalog<small>Includes a basic classroom-language filter.</small></span></label>{error && <div className="error" role="alert">{error}</div>}<div className="save-options"><button className="primary" onClick={() => save('Worksheet')}><Icon name="save" size={17}/>Save worksheet</button><button className="secondary" onClick={() => save('Problem design')}>Save problem design</button></div><p className="demo-disclosure">Sharing is simulated locally; other devices cannot see your submissions.</p></>}</section></div>}
  </div>
}
export default App
