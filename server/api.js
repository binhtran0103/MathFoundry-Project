import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { ProblemInstance } from '../src/models/worksheet.js'
import { openWorkspaceStore } from './database.js'

const deriveKey = promisify(scrypt)
const cookieName = 'mf_session'
const sessionSeconds = 60 * 60 * 24 * 7
const maxBodySize = 512 * 1024
const itemIdPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i

// Represents an API error with an HTTP status.
class RequestError extends Error {
  // Stores the status and message for the error response.
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Sends a JSON response with the given HTTP status.
function send(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(data))
}

// Reads and parses a JSON request body within the size limit.
async function readJson(request) {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') {
    throw new RequestError(415, 'Send a JSON request.')
  }
  const chunks = []
  let size = 0
  // Leave the connection open long enough to return a 413 for oversized bodies.
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length
    if (size > maxBodySize) {
      request.resume()
      throw new RequestError(413, 'This request is too large.')
    }
    chunks.push(chunk)
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks))
    if (data && typeof data === 'object' && !Array.isArray(data)) return data
  } catch {
    // Invalid JSON is handled below.
  }
  throw new RequestError(400, 'Send a JSON object.')
}

// Hashes a session token before database storage or lookup.
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

// Sets or clears the browser's session cookie.
function setSessionCookie(response, token, maxAge, secure) {
  response.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`)
}

// Normalizes and validates the submitted account details.
function normalizeCredentials(body, register) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = body.password
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RequestError(400, 'Enter a valid email address.')
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new RequestError(400, 'Use a password of 12 to 128 characters.')
  }
  if (register && (!name || name.length > 40)) {
    throw new RequestError(400, 'Enter a name of 1 to 40 characters.')
  }
  return { name, email, password }
}

// Checks that a worksheet or design is valid before saving.
function validateItem(item) {
  if (typeof item?.id !== 'string' || !itemIdPattern.test(item.id) ||
      typeof item.title !== 'string' || !item.title.trim() ||
      typeof item.tags !== 'string' || typeof item.grade !== 'string' ||
      (item.description != null && typeof item.description !== 'string') ||
      !['Worksheet', 'Problem design'].includes(item.kind) ||
      typeof item.design?.rule !== 'string' ||
      !['operator', 'style', 'operandFont', 'grade', 'tags'].every(key =>
        item.design[key] == null || typeof item.design[key] === 'string') ||
      (item.design.canvasItems != null && !validCanvas(item.design.canvasItems)) ||
      !validDesign(item.design) ||
      (item.layout != null && !validLayout(item.layout)) ||
      !Array.isArray(item.problems) || item.count !== item.problems.length ||
      item.count > 30 || !item.problems.every(validProblem)) {
    throw new RequestError(400, 'This worksheet or problem design is invalid.')
  }
  try {
    for (const problem of item.problems) {
      new ProblemInstance(problem, item.design.rule).solve()
    }
  } catch {
    throw new RequestError(400, 'This worksheet contains an invalid problem.')
  }
}

// Checks the settings for legacy and current problem designs.
function validDesign(design) {
  if (design.version !== 2) {
    return validOperand(design.a) && validOperand(design.b) &&
      (design.operands == null || Object.values(design.operands).every(validOperand))
  }
  if (!Array.isArray(design.canvasItems) || !validDimension(design.canvasWidth) ||
      typeof design.expressionEdited !== 'boolean') return false
  if (design.nextOperandNumber != null &&
      (!Number.isSafeInteger(design.nextOperandNumber) || design.nextOperandNumber < 1)) return false
  const operands = design.canvasItems.filter(item => item.type === 'operand')
  return operands.length >= 2 &&
    operands.every(item => /^[A-Z][A-Z0-9]*$/.test(item.value) && validOperand(item.constraint)) &&
    new Set(operands.map(item => item.value)).size === operands.length &&
    new Set(design.canvasItems.map(item => item.id)).size === design.canvasItems.length
}

// Checks the shape of an operand's generation settings.
function validOperand(config) {
  return ['random', 'fixed'].includes(config?.mode) &&
    ['min', 'max', 'multiple', 'value'].every(key =>
      config[key] == null || typeof config[key] === 'string' || Number.isFinite(config[key]))
}

// Checks the types and positions of saved canvas items.
function validCanvas(items) {
  return Array.isArray(items) && items.every(item =>
    typeof item?.id === 'string' && ['operand', 'operator', 'style', 'answer', 'bar'].includes(item.type) &&
    typeof item.value === 'string' && Number.isFinite(item.x) && Number.isFinite(item.y) &&
    (item.width == null || Number.isFinite(item.width)) && (item.height == null || Number.isFinite(item.height)))
}

// Accepts an omitted dimension or a finite positive size.
function validDimension(value) {
  return value == null || (Number.isFinite(value) && value > 0)
}

// Checks a saved layout and any canvas items it contains.
function validLayout(layout) {
  return layout && typeof layout === 'object' && (Array.isArray(layout)
    ? validCanvas(layout)
    : validDimension(layout.canvasWidth) && validDimension(layout.canvasHeight) &&
      (layout.items == null || validCanvas(layout.items)))
}

// Checks the saved fields for an individual problem.
function validProblem(problem) {
  if (!problem || typeof problem !== 'object') return false
  const { a, b, answer, expression, layout, values } = problem
  return (answer == null || Number.isFinite(answer)) &&
    (a == null || Number.isFinite(a)) && (b == null || Number.isFinite(b)) &&
    (expression == null || typeof expression === 'string') &&
    (layout == null || validLayout(layout)) &&
    (values == null || Object.values(values).every(value => value == null || Number.isFinite(value)))
}

// Creates the workspace API and opens its database.
export function createApi(path, { origin, secureCookies = false } = {}) {
  const store = openWorkspaceStore(path)
  const authAttempts = new Map()

  // Limits account attempts by client address.
  function checkAuthLimit(request) {
    const now = Date.now()
    for (const [address, attempt] of authAttempts) {
      if (attempt.until <= now) authAttempts.delete(address)
    }
    const address = request.socket.remoteAddress
    const attempt = authAttempts.get(address) || { count: 0, until: now + 60_000 }
    if (attempt.count >= 10 || authAttempts.size >= 10_000) {
      throw new RequestError(429, 'Too many account attempts. Try again in a minute.')
    }
    attempt.count += 1
    authAttempts.set(address, attempt)
  }

  // Collects the current profile, saved work, and public catalog.
  function workspace(user) {
    return {
      profile: user ?? null,
      saved: user ? store.listSaved(user.id) : [],
      published: store.listPublished(),
    }
  }

  // Routes API requests and sends the corresponding workspace response.
  async function handle(request, response, pathname) {
    const { method, headers } = request
    if (method !== 'GET' && (headers['sec-fetch-site'] === 'cross-site' ||
        (headers.origin && headers.origin !== (origin || `http${secureCookies ? 's' : ''}://${headers.host}`)))) {
      throw new RequestError(403, 'Open MathFoundry directly to make changes.')
    }
    const token = headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    const tokenHash = token ? hashToken(token) : null
    const user = store.getUser(tokenHash, Date.now())

    if (method === 'GET' && pathname === '/api/workspace') return send(response, 200, workspace(user))

    const register = pathname === '/api/register'
    if (method === 'POST' && (register || pathname === '/api/login')) {
      checkAuthLimit(request)
      const { name, email, password } = normalizeCredentials(await readJson(request), register)
      const existing = register ? null : store.getCredentials(email)
      const salt = existing?.salt || randomBytes(16).toString('hex')
      const hash = await deriveKey(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 })
      if (!register && (!existing || !timingSafeEqual(hash, Buffer.from(existing.password_hash, 'hex')))) {
        throw new RequestError(401, 'Email or password is incorrect.')
      }
      const profile = { id: existing?.id || randomUUID(), name: existing?.name || name, email }
      const newToken = randomBytes(32).toString('hex')
      const credentials = register ? { salt, passwordHash: hash.toString('hex') } : null
      const now = Date.now()
      if (!store.startSession(profile, credentials, hashToken(newToken), tokenHash, now, now + sessionSeconds * 1000)) {
        throw new RequestError(409, 'An account with this email already exists.')
      }
      setSessionCookie(response, newToken, sessionSeconds, secureCookies)
      return send(response, register ? 201 : 200, workspace(profile))
    }

    const itemId = pathname.startsWith('/api/library/') ? pathname.slice('/api/library/'.length) : ''
    if (!(method === 'POST' && ['/api/logout', '/api/library'].includes(pathname)) &&
        !(method === 'DELETE' && itemIdPattern.test(itemId))) {
      throw new RequestError(404, 'This endpoint does not exist.')
    }
    if (!user) throw new RequestError(401, 'Sign in to access your library.')
    if (headers['x-mathfoundry-account'] !== user.id) {
      throw new RequestError(409, 'Your account changed. Reload the page to continue.')
    }

    if (pathname === '/api/logout') {
      store.deleteSession(tokenHash)
      setSessionCookie(response, '', 0, secureCookies)
      return send(response, 200, workspace(null))
    }
    if (method === 'DELETE') {
      store.removeItem(user.id, itemId)
      return send(response, 200, workspace(user))
    }

    const { item, publish } = await readJson(request)
    validateItem(item)
    if (!store.getUser(tokenHash, Date.now())) throw new RequestError(401, 'Sign in again to save your work.')
    if (publish === true && /\b(fuck|shit|bitch|asshole)\b/i.test(`${item.title} ${item.tags}`)) {
      throw new RequestError(400, 'Please use classroom-appropriate titles and keywords.')
    }
    if (!store.saveItem(user.id, item, publish === true, Date.now())) {
      const kind = item.kind === 'Worksheet' ? 'worksheets' : 'problem templates'
      throw new RequestError(409, `Your account has reached the storage limit for ${kind}. Delete a private item of the same type to free a slot.`)
    }
    return send(response, 200, workspace(user))
  }

  return {
    // Passes API requests to the handler and forwards other requests.
    middleware(request, response, next) {
      const pathname = request.url?.split('?')[0]
      if (!pathname?.startsWith('/api/')) return next()
      handle(request, response, pathname).catch(error => {
        if (error instanceof RequestError) return send(response, error.status, { error: error.message })
        console.error(error)
        send(response, 500, { error: 'MathFoundry could not complete the request.' })
      })
    },
    // Closes the workspace database.
    close: store.close,
  }
}
