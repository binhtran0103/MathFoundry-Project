import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { solveExpression } from '../src/models/worksheet.js'
import { openDatabase } from './database.js'

const deriveKey = promisify(scrypt)
const cookieName = 'mf_session'
const sessionSeconds = 60 * 60 * 24 * 7
const maxBodySize = 512 * 1024
const itemIdPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i

class RequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function send(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(data))
}

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

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function setSessionCookie(response, token, maxAge, secure) {
  response.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`)
}

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

function validateItem(item) {
  if (typeof item?.id !== 'string' || !itemIdPattern.test(item.id) ||
      typeof item.title !== 'string' || !item.title.trim() ||
      typeof item.tags !== 'string' || typeof item.grade !== 'string' ||
      (item.description != null && typeof item.description !== 'string') ||
      !['Worksheet', 'Problem design'].includes(item.kind) ||
      typeof item.design?.rule !== 'string' ||
      !validOperand(item.design.a) || !validOperand(item.design.b) ||
      (item.design.operands != null && !Object.values(item.design.operands).every(validOperand)) ||
      !['operator', 'style', 'operandFont', 'grade', 'tags'].every(key =>
        item.design[key] == null || typeof item.design[key] === 'string') ||
      (item.design.canvasItems != null && !validCanvas(item.design.canvasItems)) ||
      !Array.isArray(item.problems) || item.count !== item.problems.length ||
      item.count > 30 || !item.problems.every(validProblem)) {
    throw new RequestError(400, 'This worksheet or problem design is invalid.')
  }
  try {
    for (const problem of item.problems) {
      solveExpression(problem.expression || item.design.rule, problem.values || { A: problem.a, B: problem.b })
    }
  } catch {
    throw new RequestError(400, 'This worksheet contains an invalid problem.')
  }
}

function validOperand(config) {
  return ['random', 'fixed'].includes(config?.mode) &&
    ['min', 'max', 'multiple', 'value'].every(key =>
      config[key] == null || typeof config[key] === 'string' || Number.isFinite(config[key]))
}

function validCanvas(items) {
  return Array.isArray(items) && items.every(item =>
    typeof item?.id === 'string' && ['operand', 'operator', 'style', 'answer', 'bar'].includes(item.type) &&
    typeof item.value === 'string' && Number.isFinite(item.x) && Number.isFinite(item.y) &&
    (item.width == null || Number.isFinite(item.width)) && (item.height == null || Number.isFinite(item.height)))
}

function validProblem(problem) {
  if (!problem || typeof problem !== 'object') return false
  const { a, b, answer, expression, layout, values } = problem
  return (answer == null || Number.isFinite(answer)) &&
    (a == null || Number.isFinite(a)) && (b == null || Number.isFinite(b)) &&
    (expression == null || typeof expression === 'string') &&
    (layout == null || validCanvas(Array.isArray(layout) ? layout : layout.items)) &&
    (values == null || Object.values(values).every(value => value == null || Number.isFinite(value)))
}

export function createApi(path, { origin, secureCookies = false } = {}) {
  const db = openDatabase(path)
  const authAttempts = new Map()
  const getUser = db.prepare(`
    SELECT users.id, users.name, users.email FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE token_hash = ? AND expires_at > ?
  `)
  const getCredentials = db.prepare('SELECT * FROM users WHERE email = ?')
  const insertUser = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING')
  const insertSession = db.prepare('INSERT INTO sessions VALUES (?, ?, ?)')
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?')
  const deleteExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?')
  const listItems = db.prepare('SELECT payload FROM library_items WHERE user_id = ? AND in_library = 1 ORDER BY created_at DESC, rowid DESC')
  const listPublic = db.prepare('SELECT user_id, item_id, payload FROM library_items WHERE published = 1 ORDER BY created_at DESC, rowid DESC')
  const insertItem = db.prepare(`
    INSERT INTO library_items (user_id, item_id, payload, published, created_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET in_library = 1
  `)
  const removeItem = db.prepare('DELETE FROM library_items WHERE user_id = ? AND item_id = ? AND published = 0')
  const hideItem = db.prepare('UPDATE library_items SET in_library = 0 WHERE user_id = ? AND item_id = ? AND published = 1')

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

  function workspace(user) {
    return {
      profile: user ?? null,
      saved: user ? listItems.all(user.id).map(row => JSON.parse(row.payload)) : [],
      published: listPublic.all().map(row => ({ ...JSON.parse(row.payload), id: `${row.user_id}/${row.item_id}` })),
    }
  }

  async function handle(request, response, pathname) {
    const { method, headers } = request
    if (method !== 'GET' && (headers['sec-fetch-site'] === 'cross-site' ||
        (headers.origin && headers.origin !== (origin || `http${secureCookies ? 's' : ''}://${headers.host}`)))) {
      throw new RequestError(403, 'Open MathFoundry directly to make changes.')
    }
    const token = headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    const tokenHash = token ? hashToken(token) : null
    const user = getUser.get(tokenHash, Date.now())

    if (method === 'GET' && pathname === '/api/workspace') return send(response, 200, workspace(user))

    const register = pathname === '/api/register'
    if (method === 'POST' && (register || pathname === '/api/login')) {
      checkAuthLimit(request)
      const { name, email, password } = normalizeCredentials(await readJson(request), register)
      const existing = register ? null : getCredentials.get(email)
      const salt = existing?.salt || randomBytes(16).toString('hex')
      const hash = await deriveKey(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 })
      if (!register && (!existing || !timingSafeEqual(hash, Buffer.from(existing.password_hash, 'hex')))) {
        throw new RequestError(401, 'Email or password is incorrect.')
      }
      const profile = { id: existing?.id || randomUUID(), name: existing?.name || name, email }
      const newToken = randomBytes(32).toString('hex')
      db.exec('BEGIN IMMEDIATE')
      try {
        if (register && !insertUser.run(profile.id, name, email, salt, hash.toString('hex')).changes) {
          throw new RequestError(409, 'An account with this email already exists.')
        }
        deleteExpired.run(Date.now())
        if (tokenHash) deleteSession.run(tokenHash)
        insertSession.run(hashToken(newToken), profile.id, Date.now() + sessionSeconds * 1000)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
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
      deleteSession.run(tokenHash)
      setSessionCookie(response, '', 0, secureCookies)
      return send(response, 200, workspace(null))
    }
    if (method === 'DELETE') {
      removeItem.run(user.id, itemId)
      hideItem.run(user.id, itemId)
      return send(response, 200, workspace(user))
    }

    const { item, publish } = await readJson(request)
    validateItem(item)
    if (!getUser.get(tokenHash, Date.now())) throw new RequestError(401, 'Sign in again to save your work.')
    if (publish === true && /\b(fuck|shit|bitch|asshole)\b/i.test(`${item.title} ${item.tags}`)) {
      throw new RequestError(400, 'Please use classroom-appropriate titles and keywords.')
    }
    insertItem.run(user.id, item.id, JSON.stringify({ ...item, name: item.title, popularity: 0 }), Number(publish === true), Date.now())
    return send(response, 200, workspace(user))
  }

  return {
    middleware(request, response, next) {
      const pathname = request.url?.split('?')[0]
      if (!pathname?.startsWith('/api/')) return next()
      handle(request, response, pathname).catch(error => {
        if (error instanceof RequestError) return send(response, error.status, { error: error.message })
        console.error(error)
        send(response, 500, { error: 'MathFoundry could not complete the request.' })
      })
    },
    close: () => db.close(),
  }
}
