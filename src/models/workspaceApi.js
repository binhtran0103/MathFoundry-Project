export async function workspaceRequest(path, { method = 'GET', body, accountId, signal } = {}) {
  const response = await fetch(`/api/${path}`, {
    method,
    signal,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(accountId && { 'X-MathFoundry-Account': accountId }),
    },
    body: body && JSON.stringify(body),
  })
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The account service is unavailable.')
  }
  const data = await response.json()
  if (!response.ok) throw new Error(data.error)
  return data
}
