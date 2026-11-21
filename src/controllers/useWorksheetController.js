import { useEffect, useRef, useState } from 'react'
import { ProblemTemplate, Worksheet } from '../models/worksheet.js'
import { Operand, Operator, StyleItem } from '../models/problemElements.js'
import { User } from '../models/user.js'
import { examples } from '../models/catalog.js'
import { read, write } from '../models/storage.js'
import { workspaceRequest } from '../models/workspaceApi.js'

// Manages worksheet editing, navigation, and workspace actions.
export default function useWorksheetController() {
  const [page, setPage] = useState('Overview')
  const [worksheet, setWorksheet] = useState(() => Worksheet.generate(new ProblemTemplate(), 12))
  const [design, setTemplate] = useState(worksheet.template)
  const [title, setTitle] = useState(worksheet.template.name)
  const [count, setCount] = useState(12)
  const [selectedObject, setSelectedObject] = useState('operand-a')
  const [dragPreview, setDragPreview] = useState(null)
  const dragRef = useRef(null)
  const canvasRef = useRef(null)
  const revealElement = useRef(null)
  const canvasItems = design.canvasItems
  const problems = worksheet.problems
  const [answers, setShowAnswers] = useState(false)
  const [guestItems, setGuestItems] = useState(() => read('mf-saved', []))
  const [legacyPublicItems] = useState(() => read('mf-public', []))
  const [workspace, setWorkspace] = useState({ profile: null, saved: [], published: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const { published } = workspace
  const profile = workspace.profile ? new User(workspace.profile, workspace.saved) : null
  const saved = profile?.library ?? guestItems
  const importable = profile?.browserWorkToImport(guestItems) ?? []
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('All grades')
  const [sort, setSort] = useState('popular')
  const [tab, setTab] = useState('Worksheets')
  const [error, setError] = useState('')
  const [publish, setPublish] = useState(false)
  const [step, setActiveStep] = useState('design')
  const [help, setHelp] = useState(false)
  // Shows a temporary notice.
  function toast(message) { setNotice(message); window.setTimeout(() => setNotice(''), 4500) }
  // Loads the workspace on mount and cancels the request on unmount.
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

  // Runs one storage action at a time and reports errors.
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

  // Sends a workspace request for the current account.
  function accountRequest(path, options) {
    return workspaceRequest(path, { ...options, accountId: profile.id })
  }

  // Saves guest work in the browser and updates the displayed library.
  function updateGuestLibrary(items) {
    write('mf-saved', items)
    setGuestItems(items)
  }

  // Opens the account dialog and clears the previous error.
  function openAccount() {
    setError('')
    setModal('profile')
  }
  // Switches pages and clears the current error and search.
  function navigate(next) { setPage(next); setError(''); setSearch('') }
  // Loads a worksheet and resets the editor selection and answer display.
  function openWorksheet(next, nextTitle) {
    setWorksheet(next)
    setTemplate(next.template)
    setTitle(nextTitle)
    setCount(next.problems.length)
    setSelectedObject(next.template.canvasItems.find(item => item instanceof Operand)?.id || '')
    setShowAnswers(false)
  }

  // Opens a library or catalog item in the worksheet workshop.
  function useTemplate(item) {
    try {
      const next = profile?.openSavedWork(item.id) || Worksheet.fromItem(item)
      openWorksheet(next, item.title || item.name)
      setActiveStep('worksheet')
      navigate('Create worksheet')
    } catch (error) {
      setError(error.message)
      toast(error.message)
    }
  }

  // Updates the solution expression and marks it as manually edited.
  function setExpression(rule) {
    setTemplate(current => current.with({ rule, expressionEdited: true }))
    setError('')
  }

  // Applies design changes to the editor and the matching worksheet.
  function setDesign(patch) {
    const next = design.with(patch)
    setTemplate(next)
    if (worksheet.template === design) setWorksheet(worksheet.withPresentation(next))
  }

  // Renames an operand in the design and its matching worksheet.
  function renameOperand(id, input) {
    if (worksheet.template === design) {
      const next = worksheet.renameOperand(id, input)
      setWorksheet(next)
      setTemplate(next.template)
    } else {
      setTemplate(design.renameOperand(id, input))
    }
    setError('')
  }

  // Changes the generation settings for the specified operand.
  function updateOperandSettings(id, patch) {
    setTemplate(current => current.with({
      canvasItems: current.canvasItems.map(item => item.id === id ? item.withSettings(patch) : item),
    }))
  }

  // Generates problems with the current design and canvas dimensions.
  function generateWorksheet() {
    const bounds = canvasRef.current?.getBoundingClientRect()
    const layout = design.layout(bounds?.width || design.canvasWidth || worksheet.layout.canvasWidth,
      bounds?.height || worksheet.layout.canvasHeight)
    return Worksheet.generate(design, count, layout)
  }

  // Generates a worksheet and opens its preview.
  function generateFromCanvas() {
    try {
      setWorksheet(generateWorksheet())
      setError('')
      setActiveStep('worksheet')
      toast('Worksheet created from your problem layout.')
    } catch (error) {
      setError(error.message)
    }
  }

  // Switches workshop steps and regenerates the preview when needed.
  function setStep(next) {
    if (next === 'worksheet' && (worksheet.template !== design || problems.length !== count)) {
      generateFromCanvas()
      return
    }
    setActiveStep(next)
  }

  // Edits or rerolls one operand in a worksheet problem.
  function changeOperand(index, name, value) {
    try {
      setWorksheet(worksheet.changeOperand(index, name, value))
      setError('')
    } catch (error) {
      setError(error.message)
    }
  }

  // Toggles the answer key when a worksheet has answers.
  function setAnswers(show) {
    try {
      if (show && worksheet.answerKey.solutions.length === 0) throw new Error('Generate a worksheet to see its answers.')
      setShowAnswers(show)
      setError('')
    } catch (error) {
      setError(error.message)
    }
  }

  // Updates the canvas items and applies any additional design changes.
  function updateElements(items, patch) {
    setTemplate(current => current.withElements(items).with(patch))
    setError('')
  }

  // Adds an operand to the canvas and selects it for editing.
  function addOperand() {
    const width = canvasRef.current?.getBoundingClientRect().width
    if (!width) return
    const next = design.appendOperand(width)
    const { id } = next.canvasItems.at(-1)
    revealElement.current = id
    setTemplate(next)
    setSelectedObject(id)
    setError('')
  }

  // Scrolls a newly added operand or operator into view.
  useEffect(() => {
    const id = revealElement.current
    const canvas = canvasRef.current
    if (id && canvas) {
      revealElement.current = null
      const item = [...canvas.querySelectorAll('[data-canvas-id]')].find(node => node.dataset.canvasId === id)
      if (item) {
        const viewport = canvas.parentElement
        const visible = viewport.getBoundingClientRect()
        const element = item.getBoundingClientRect()
        if (element.left < visible.left) viewport.scrollLeft += element.left - visible.left - 12
        if (element.right > visible.right) viewport.scrollLeft += element.right - visible.right + 12
      }
    }
  }, [design])
  // Checks the drop position and applies a valid canvas change.
  function commitCanvasDrop(payload, clientX, clientY) {
    const canvas = canvasRef.current
    let id
    if (canvas) {
      const bounds = canvas.getBoundingClientRect()
      const [type, paletteValue] = payload.split(':')
      const value = type === 'operator' ? '+' : paletteValue
      const replaced = canvasItems.find(item => item.id === value && type === 'move') ||
        (type === 'style' && canvasItems.find(item => item.type === 'style'))
      const nodes = [...canvas.querySelectorAll('[data-canvas-id]')]
      const existing = replaced && nodes.find(node => node.dataset.canvasId === replaced.id)
      const width = existing?.offsetWidth || ({ answer: 120, bar: 160, style: 108, operator: 48 })[type]
      const height = existing?.offsetHeight || ({ answer: 56, bar: 4, style: 32, operator: 48 })[type]
      const px = Math.max(width / 2, Math.min(bounds.width - width / 2, clientX - bounds.left))
      const py = Math.max(height / 2, Math.min(bounds.height - height / 2, clientY - bounds.top))
      const collision = nodes.some(node => {
        let overlaps = false
        if (node.dataset.canvasId !== replaced?.id) {
          const rect = node.getBoundingClientRect()
          const dx = Math.abs(px - (rect.left - bounds.left + rect.width / 2))
          const dy = Math.abs(py - (rect.top - bounds.top + rect.height / 2))
          overlaps = dx < (width + rect.width) / 2 - 1 && dy < (height + rect.height) / 2 - 1
        }
        return overlaps
      })
      if (collision) {
        setError('That position overlaps another object. Move it to a clear space.')
      } else {
        const position = { x: px / bounds.width * 100, y: py / bounds.height * 100 }
        id = replaced?.id || crypto.randomUUID()
        const geometry = { id, value, ...position }
        let element
        if (replaced) element = replaced.with(type === 'move' ? position : { ...position, value })
        else if (type === 'operator') element = new Operator(geometry)
        else if (type === 'style') element = new StyleItem(geometry)
        else element = new StyleItem({ ...geometry, type, width, height })

        const items = replaced ? canvasItems.map(item => item.id === id ? element : item) : [...canvasItems, element]
        const patch = type === 'operator' ? { operator: value } : type === 'style' ? { style: value } : {}
        updateElements(items, patch)
        setSelectedObject(id)
      }
    }
    return id
  }

  // Places an operator between adjacent operands.
  function addOperator() {
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return
    const arithmetic = canvasItems.filter(item => item instanceof Operand || item instanceof Operator)
      .sort((left, right) => left.x - right.x)
    const rightIndex = arithmetic.findIndex((item, index) => item instanceof Operand && arithmetic[index - 1] instanceof Operand)
    if (rightIndex === -1) {
      setError('Add an operand to open another gap, or drag the operator to a clear space on the canvas.')
    } else {
      const left = arithmetic[rightIndex - 1]
      const right = arithmetic[rightIndex]
      revealElement.current = commitCanvasDrop('operator',
        bounds.left + (left.x + right.x) * bounds.width / 200,
        bounds.top + (left.y + right.y) * bounds.height / 200)
    }
  }
  // Starts dragging an existing canvas object.
  function beginCanvasDrag(event, item) {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = { payload: `move:${item.id}`, id: item.id, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - (rect.left + rect.width / 2), offsetY: event.clientY - (rect.top + rect.height / 2), source: 'canvas', moved: false }
    setDragPreview(null)
  }
  // Starts dragging a new object from the palette.
  function beginPaletteDrag(event, payload) {
    event.preventDefault()
    dragRef.current = { payload, startX: event.clientX, startY: event.clientY, offsetX: 0, offsetY: 0, source: 'palette', moved: false }
    setDragPreview(null)
  }
  // Changes the value of the selected canvas object.
  function updateSelectedObject(value) {
    const item = canvasItems.find(object => object.id === selectedObject)
    if (!item) return
    const items = canvasItems.map(object => object.id === item.id ? object.with({ value }) : object)
    updateElements(items, item instanceof Operator ? { operator: value } : { style: value })
  }
  // Resizes a selected answer space or divider if there is room.
  function resizeAnswerObject(dimension, rawValue) {
    const selected = canvasItems.find(object => object.id === selectedObject && ['answer','bar'].includes(object.type))
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!selected || !bounds) return
    const value = Math.max(40, Math.min(dimension === 'width' ? bounds.width : bounds.height, Number(rawValue) || 40))
    const width = dimension === 'width' ? value : selected.width
    const height = dimension === 'height' ? value : selected.height
    const cx = selected.x * bounds.width / 100, cy = selected.y * bounds.height / 100
    const collision = canvasItems.some(item => {
      let overlaps = false
      if (item.id !== selected.id) {
        const otherWidth = ['answer','bar'].includes(item.type) ? item.width : item.type === 'operand' ? 72 : item.type === 'operator' ? 48 : 108
        const otherHeight = ['answer','bar'].includes(item.type) ? item.height : item.type === 'style' ? 32 : 48
        const dx = Math.abs(cx - item.x * bounds.width / 100)
        const dy = Math.abs(cy - item.y * bounds.height / 100)
        overlaps = dx < (width + otherWidth) / 2 - 1 && dy < (height + otherHeight) / 2 - 1
      }
      return overlaps
    })
    if (collision) {
      setError('That answer box size overlaps another object. Make it smaller or move it.')
    } else {
      setTemplate(current => current.with({ canvasItems: current.canvasItems.map(item => item.id === selected.id ? item.with({ [dimension]: value }) : item) }))
      setError('')
    }
  }
  // Registers pointer listeners for canvas and palette dragging.
  useEffect(() => {
    // Tracks pointer movement and updates the drag preview.
    const onMove = event => {
      const drag = dragRef.current
      if (!drag) return
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) drag.moved = true
      if (drag.moved) {
        const item = drag.id && canvasItems.find(object => object.id === drag.id)
        const label = item?.label ?? (drag.payload === 'operator' ? 'Operator' : drag.payload.split(':')[1])
        setDragPreview({ label, x: event.clientX, y: event.clientY })
      }
    }
    // Finishes the drag and applies the drop when appropriate.
    const onUp = event => {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      if (!drag.moved) {
        if (drag.source === 'canvas') setSelectedObject(drag.id)
      } else {
        const bounds = canvasRef.current?.parentElement.getBoundingClientRect()
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
  // Saves the current worksheet or design to the workspace library.
  function save(kind) {
    let item
    if (!title.trim()) {
      setError('Give your worksheet a title before saving.')
    } else if (publish && /\b(fuck|shit|bitch|asshole)\b/i.test(`${title} ${design.tags}`)) {
      setError('Please use classroom-appropriate titles and keywords.')
    } else {
      try {
        const next = worksheet.template === design && problems.length === count ? worksheet : generateWorksheet()
        item = next.toItem({ title: title.trim(), kind })
      } catch (error) {
        setError(error.message)
      }
    }
    let saveRequest
    if (item) {
      saveRequest = runStorageAction(async () => {
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
    return saveRequest
  }
  // Removes an item from the current library.
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
  // Signs in or registers an account and loads its workspace.
  function authenticate(form, register) {
    const body = Object.fromEntries(new FormData(form))
    return runStorageAction(async () => {
      setWorkspace(await workspaceRequest(register ? 'register' : 'login', { method: 'POST', body }))
      setModal(null)
      toast(register ? 'Your account is ready.' : 'Signed in.')
    })
  }
  // Ends the current session and returns to the guest workspace.
  function signOut() {
    return runStorageAction(async () => {
      setWorkspace(await accountRequest('logout', { method: 'POST' }))
      const initial = Worksheet.generate(new ProblemTemplate(), 12)
      openWorksheet(initial, initial.template.name)
      setPublish(false)
      setActiveStep('design')
      setModal(null)
      navigate('Overview')
      toast('Signed out.')
    })
  }
  // Copies eligible browser-saved items into the signed-in library.
  function importBrowserWork() {
    return runStorageAction(async () => {
      for (const item of importable) {
        setWorkspace(await accountRequest('library', { method: 'POST', body: { item, publish: false } }))
      }
      toast('Browser work copied to your private library.')
    })
  }
  // Removes a canvas object and clears its selection when needed.
  function removeCanvasItem(id) {
    updateElements(canvasItems.filter(item => item.id !== id))
    if (selectedObject === id) setSelectedObject('')
  }
  return {
    page, design, setDesign, title, setTitle, count, setCount, problems, answerKey: answers ? worksheet.answerKey : null, selectedObject, selectCanvasItem: setSelectedObject, dragPreview, canvasRef, canvasItems, setExpression, addOperand, addOperator, answers, setAnswers, saved, profile, modal, setModal, notice, search, setSearch, grade, setGrade, sort, setSort, tab, setTab, error, setError, publish, setPublish, step, setStep, help, setHelp, toast, navigate, useTemplate, renameOperand, updateOperandSettings, generateFromCanvas, changeOperand, beginCanvasDrag, beginPaletteDrag, updateSelectedObject, resizeAnswerObject, save, remove, catalog, authenticate, signOut, openAccount, importBrowserWork, importableCount: importable.length, busy: busy || loading, removeCanvasItem
  }
}
