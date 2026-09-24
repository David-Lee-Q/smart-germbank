import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import { toAlert } from '../lib/mappers.js'
import { DomainError } from '../lib/calc.js'
import { writeAudit } from '../lib/util.js'

export function alertRoutes(db: DB): Router {
  const router = Router()

  router.get('/', (req, res) => {
    const { type, level, status } = req.query as Record<string, string | undefined>
    const clauses: string[] = []
    const params: unknown[] = []
    if (type) {
      clauses.push('type = ?')
      params.push(type)
    }
    if (level) {
      clauses.push('level = ?')
      params.push(level)
    }
    if (status) {
      clauses.push('status = ?')
      params.push(status)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db.prepare(`SELECT * FROM alerts ${where} ORDER BY created_at DESC, id`).all(...(params as never[]))
    res.json(rows.map((r) => toAlert(r as Record<string, unknown>)))
  })

  router.get('/summary', (_req, res) => {
    const total = (db.prepare('SELECT COUNT(*) AS c FROM alerts').get() as { c: number }).c
    const pending = (db.prepare(`SELECT COUNT(*) AS c FROM alerts WHERE status != '已闭环'`).get() as { c: number }).c
    const severe = (db.prepare(`SELECT COUNT(*) AS c FROM alerts WHERE level = '严重' AND status != '已闭环'`).get() as { c: number }).c
    const closed = (db.prepare(`SELECT COUNT(*) AS c FROM alerts WHERE status = '已闭环'`).get() as { c: number }).c
    res.json({ total, pending, severe, closed })
  })

  router.post('/:id/handle', (req, res) => {
    const parsed = z.object({ status: z.enum(['未处理', '处理中', '已闭环']), note: z.string().optional() }).safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', '状态非法')
    const row = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id)
    if (!row) throw new DomainError('NOT_FOUND', '预警不存在', 404)
    db.prepare('UPDATE alerts SET status=? WHERE id=?').run(parsed.data.status, req.params.id)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '处理预警', 'Alert', req.params.id, req.ip ?? '127.0.0.1')
    const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id)
    res.json(toAlert(updated as Record<string, unknown>))
  })

  return router
}
