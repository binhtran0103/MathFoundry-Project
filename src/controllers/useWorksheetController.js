import { useEffect, useRef, useState } from 'react'
import { initialDesign, symbols, drawOperand, generate, solveExpression, operandSettings } from '../models/worksheet.js'
import { examples } from '../models/catalog.js'
import { read, write } from '../models/storage.js'
import { workspaceRequest } from '../models/workspaceApi.js'

const initialCanvasItems = [
  { id: 'operand-a', type: 'operand', value: 'A', x: 20, y: 50 },
  { id: 'operator', type: 'operator', value: '+', x: 50, y: 50 },
  { id: 'operand-b', type: 'operand', value: 'B', x: 80, y: 50 },
]

export default function useWorksheetController() {
  const [page, setPage] = useState('Overview')
  const [design, setDesign] = useState(structuredClone(initialDesign))
  const [title, setTitle] = useState('Two-digit addition')
  const [count, setCount] = useState(12)
  const [problems, setProblems] = useState(() => generate(initialDesign, 12))
  const [selectedObject, setSelectedObject] = useState('operand-a')
  const [dragPreview, setDragPreview] = useState(null)
  const dragRef = useRef(null)
  const canvasRef = useRef(null)
  const [canvasItems, setCanvasItems] = useState(initialCanvasItems)
  const [expressionEdited, setExpressionEdited] = useState(false)
  const [answers, setAnswers] = useState(false)
  const [guestItems, setGuestItems] = useState(() => read('mf-saved', []))
  const [legacyPublicItems] = useState(() => read('mf-public', []))
  const [workspace, setWorkspace] = useState({ profile: null, saved: [], published: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const { profile, published } = workspace
  const saved = profile ? workspace.saved : guestItems
  const importable = profile ? guestItems.filter(item => !workspace.saved.some(entry => entry.id === item.id)) : []
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
  useEffect(() => {
    const request = new AbortController()
    workspaceRequest('workspace', { signal: request.signal })
      .then(setWorkspace)
      .catch(() => {
        if (!request.signal.aborted) toast('Account storage is unavailable. Reload to reconnect.')
      })
      .finally(() => {
        if (!request.signal.aborted) setLoading(false)
      })
    return () => request.abort()
  }, [])

  async function runStorageAction(action, reportError = setError) {
    if (loading || pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (error) {
      reportError(error.message)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  function accountRequest(path, options) {
    return workspaceRequest(path, { ...options, accountId: profile.id })
  }

  function updateGuestLibrary(items) {
    write('mf-saved', items)
    setGuestItems(items)
  }

  function openAccount() {
    setError('')
    setModal('profile')
  }
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
  function beginPaletteDrag(event, payload) {
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
  })
  function save(kind) {
    if (!title.trim()) { setError('Give your worksheet a title before saving.'); return }
    if (publish && /\b(fuck|shit|bitch|asshole)\b/i.test(`${title} ${design.tags}`)) { setError('Please use classroom-appropriate titles and keywords.'); return }
    try { problems.forEach(p => solveExpression(p.expression || design.rule, p.values || { A: p.a, B: p.b })) } catch (e) { setError(e.message); return }
    const item = { id: crypto.randomUUID(), name: title.trim(), title: title.trim(), design: { ...structuredClone(design), canvasItems: structuredClone(canvasItems) }, problems: structuredClone(problems), count: problems.length, grade: design.grade, tags: design.tags, operator: design.operator, kind, date: new Date().toLocaleDateString(), color: 'sage', popularity: 0 }
    return runStorageAction(async () => {
      if (profile) {
        setWorkspace(await accountRequest('library', { method: 'POST', body: { item, publish } }))
      } else {
        if (publish) throw new Error('Sign in to publish to the catalog.')
        updateGuestLibrary([item, ...guestItems])
      }
      setModal(null)
      setPublish(false)
      toast(`${kind} saved${publish ? ' and published to the catalog' : ' to your library'}.`)
    })
  }
  function remove(id) {
    return runStorageAction(async () => {
      if (profile) {
        setWorkspace(await accountRequest(`library/${id}`, { method: 'DELETE' }))
      } else {
        updateGuestLibrary(guestItems.filter(item => item.id !== id))
      }
      toast('Removed from your library.')
    }, toast)
  }
  const catalog = [...published, ...legacyPublicItems, ...examples].filter(item => `${item.name} ${item.tags} ${item.grade}`.toLowerCase().includes(search.toLowerCase()) && (grade === 'All grades' || item.grade === grade) && (tab === 'Worksheets' ? item.kind !== 'Problem design' : item.kind !== 'Worksheet')).sort((a,b) => sort === 'popular' ? b.popularity-a.popularity : a.name.localeCompare(b.name))
  function authenticate(form, register) {
    const body = Object.fromEntries(new FormData(form))
    return runStorageAction(async () => {
      setWorkspace(await workspaceRequest(register ? 'register' : 'login', { method: 'POST', body }))
      setModal(null)
      toast(register ? 'Your account is ready.' : 'Signed in.')
    })
  }
  function signOut() {
    return runStorageAction(async () => {
      setWorkspace(await accountRequest('logout', { method: 'POST' }))
      setDesign(structuredClone(initialDesign))
      setCanvasItems(initialCanvasItems)
      setTitle('Two-digit addition')
      setCount(12)
      setProblems(generate(initialDesign, 12))
      setSelectedObject('operand-a')
      setExpressionEdited(false)
      setAnswers(false)
      setPublish(false)
      setStep('design')
      setModal(null)
      navigate('Overview')
      toast('Signed out.')
    })
  }
  function importBrowserWork() {
    return runStorageAction(async () => {
      for (const item of importable) {
        setWorkspace(await accountRequest('library', { method: 'POST', body: { item, publish: false } }))
      }
      toast('Browser work copied to your private library.')
    })
  }
  function removeCanvasItem(id) {
    const next = canvasItems.filter(item => item.id !== id)
    setCanvasItems(next)
    if (selectedObject === id) setSelectedObject('')
    if (!expressionEdited) setDesign(current => ({ ...current, rule: problemExpression(next) }))
  }
  return {
    page, design, setDesign, title, setTitle, count, setCount, problems, selectedObject, dragPreview, canvasRef, canvasItems, setExpressionEdited, answers, setAnswers, saved, profile, modal, setModal, notice, search, setSearch, grade, setGrade, sort, setSort, tab, setTab, error, setError, publish, setPublish, step, setStep, help, setHelp, toast, navigate, useTemplate, updateOperandSettings, generateFromCanvas, changeOperand, beginCanvasDrag, beginPaletteDrag, updateSelectedObject, resizeAnswerObject, save, remove, catalog, authenticate, signOut, openAccount, importBrowserWork, importableCount: importable.length, busy: busy || loading, removeCanvasItem
  }
}
