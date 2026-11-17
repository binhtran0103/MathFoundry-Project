import react from '@vitejs/plugin-react'
import { defineConfig, normalizePath } from 'vite'
import { isAbsolute, relative, resolve } from 'node:path'
import { createApi } from './server/api.js'

const databasePath = resolve(process.env.MATHFOUNDRY_DB || '.mathfoundry/mathfoundry.sqlite')

// Adds the workspace API to Vite and closes it when the server shuts down.
function mountApi(server) {
  for (const directory of [server.config.publicDir, resolve(server.config.root, server.config.build.outDir)]) {
    if (!directory) continue
    const location = relative(directory, databasePath)
    if (!isAbsolute(location) && location !== '..' && !/^\.\.[\\/]/.test(location)) {
      throw new Error('MATHFOUNDRY_DB must be outside the public and build directories.')
    }
  }
  const api = createApi(databasePath, {
    origin: process.env.MATHFOUNDRY_ORIGIN,
    secureCookies: process.env.MATHFOUNDRY_ORIGIN?.startsWith('https://'),
  })
  server.middlewares.use(api.middleware)
  server.httpServer?.once('close', api.close)
}

export default defineConfig({
  plugins: [react(), { name: 'mathfoundry-api', configureServer: mountApi, configurePreviewServer: mountApi }],
  server: {
    host: true,
    port: 5173,
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.mathfoundry/**', '**/*.sqlite*', '**/*.db*', normalizePath(databasePath) + '*'],
    },
    watch:{
      usePolling: true
    }
  }
})
