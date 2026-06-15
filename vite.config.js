import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/mundial-viz/',

  plugins: [
    svelte(),
    {
      // En dev sirve el CSV desde ../data/ sin necesidad de copiarlo
      name: 'serve-data',
      configureServer(server) {
        server.middlewares.use('/data', (req, res, next) => {
          const file = path.join(__dirname, '..', 'data', decodeURIComponent(req.url))
          if (fs.existsSync(file) && fs.statSync(file).isFile()) {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.end(fs.readFileSync(file))
          } else {
            next()
          }
        })
      },
    },
  ],
})
