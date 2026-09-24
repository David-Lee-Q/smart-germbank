import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import type { DB } from './db.js'
import { DomainError } from './lib/calc.js'
import { accessionRoutes } from './routes/accessions.js'
import { inventoryRoutes } from './routes/inventory.js'
import { viabilityRoutes } from './routes/viability.js'
import { regenerationRoutes } from './routes/regeneration.js'
import { distributionRoutes } from './routes/distribution.js'
import { environmentRoutes } from './routes/environment.js'
import { alertRoutes } from './routes/alerts.js'
import { systemRoutes } from './routes/system.js'
import { dashboardRoutes } from './routes/dashboard.js'

export function createApp(db: DB) {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'germplasm-server', time: new Date().toISOString() })
  })

  app.use('/api/accessions', accessionRoutes(db))
  app.use('/api/inventory', inventoryRoutes(db))
  app.use('/api/viability', viabilityRoutes(db))
  app.use('/api/regenerations', regenerationRoutes(db))
  app.use('/api/distributions', distributionRoutes(db))
  app.use('/api', environmentRoutes(db))
  app.use('/api/alerts', alertRoutes(db))
  app.use('/api/system', systemRoutes(db))
  app.use('/api/dashboard', dashboardRoutes(db))

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } })
  })

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } })
      return
    }
    const message = err instanceof Error ? err.message : '服务器内部错误'
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
  })

  return app
}
