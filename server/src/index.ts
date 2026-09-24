import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createApp } from './app.js'
import { createDb } from './db.js'
import { seed } from './seed.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH ?? join(__dirname, '..', 'data', 'germplasm.db')
const db = createDb(dbPath)
seed(db)

const port = Number(process.env.PORT ?? 3001)
const app = createApp(db)

app.listen(port, '0.0.0.0', () => {
  console.log(`[germplasm-server] listening on http://0.0.0.0:${port}`)
})
