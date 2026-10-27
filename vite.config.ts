/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const prefixes = ['', '/de', '/fr', '/es']
const pages = prefixes.flatMap((p) => [`${p}/`, `${p}/investors/`, `${p}/privacy/`])

/**
 * Serve routes the way nginx does in production: known pages in dev render through
 * the single index.html; in preview, unknown paths get dist/404.html with a 404.
 */
function routes(): Plugin {
  return {
    name: 'blakra-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? '/').split('?')[0]
        if (pages.includes(path) || pages.includes(`${path}/`)) req.url = '/index.html'
        next()
      })
    },
    configurePreviewServer(server) {
      const out = server.config.build.outDir
      const isFile = (f: string) => existsSync(f) && statSync(f).isFile()
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? '/').split('?')[0])
        const file = join(out, path)
        if (file.startsWith(out) && (isFile(file) || isFile(join(file, 'index.html')))) {
          // Like nginx: a folder without its trailing slash redirects to it.
          if (!path.endsWith('/') && !isFile(file)) {
            res.statusCode = 301
            res.setHeader('Location', `${path}/`)
            return res.end()
          }
          return next()
        }
        const prefix = prefixes.find((p) => p && path.startsWith(`${p}/`)) ?? ''
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html')
        res.end(readFileSync(join(out, prefix.slice(1), '404.html')))
      })
    },
  }
}

export default defineConfig({
  appType: 'mpa',
  plugins: [react(), routes()],
  build: {
    target: 'es2022',
    manifest: true,
    assetsInlineLimit: 0,
  },
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
