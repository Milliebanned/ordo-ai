import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const BACKEND = process.env.ORDO_BACKEND_URL || 'http://localhost:3001'
const BACKEND_DIR = resolve(import.meta.dirname, '../ordo-backend')

// Same-origin /api → backend, so the page never depends on CORS or a hardcoded port.
const proxy = {
  '/api': { target: BACKEND, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
}

async function backendUp() {
  try {
    const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

// Starts ordo-backend alongside the dev/preview server when it isn't already running.
function ordoBackend() {
  let child = null
  async function start(logger) {
    if (await backendUp()) {
      logger.info(`  ordo-backend already running at ${BACKEND}`)
      return
    }
    logger.info(`  starting ordo-backend (${BACKEND_DIR})`)
    child = spawn('npm', ['start'], { cwd: BACKEND_DIR, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('exit', (code) => {
      if (code) logger.error(`  ordo-backend exited with code ${code}`)
      child = null
    })
    const stop = () => child?.kill()
    process.once('exit', stop)
    process.once('SIGINT', () => { stop(); process.exit() })
    process.once('SIGTERM', () => { stop(); process.exit() })
  }
  return {
    name: 'ordo-backend',
    configureServer(server) { start(server.config.logger) },
    configurePreviewServer(server) { start(server.config.logger) },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ordoBackend()],
  server: { proxy },
  preview: { proxy },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app.html'),
      },
    },
  },
})
