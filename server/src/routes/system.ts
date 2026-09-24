import { Router } from 'express'
import type { DB } from '../db.js'
import { toAuditLog, toRole, toUser } from '../lib/mappers.js'

export function systemRoutes(db: DB): Router {
  const router = Router()

  router.get('/users', (_req, res) => {
    res.json(db.prepare('SELECT * FROM users ORDER BY id').all().map((r) => toUser(r as Record<string, unknown>)))
  })

  router.get('/roles', (_req, res) => {
    res.json(db.prepare('SELECT * FROM roles ORDER BY id').all().map((r) => toRole(r as Record<string, unknown>)))
  })

  router.get('/dictionaries', (_req, res) => {
    res.json({
      库类型: ['长期库', '中期库', '短期库', '复份库', '离体库'],
      来源类型: ['野外采集', '国内交换', '国外引进', '育种选育', '农家品种'],
      预警类型: ['库存不足', '活力下降', '存储超期', '环境异常', '设备离线'],
      检测方法: ['发芽试验', 'TTC染色', '四唑染色'],
    })
  })

  router.get('/audit-logs', (req, res) => {
    const { operator, objectType } = req.query as Record<string, string | undefined>
    const clauses: string[] = []
    const params: unknown[] = []
    if (operator) {
      clauses.push('operator = ?')
      params.push(operator)
    }
    if (objectType) {
      clauses.push('object_type = ?')
      params.push(objectType)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC, id DESC LIMIT 200`).all(...(params as never[]))
    res.json(rows.map((r) => toAuditLog(r as Record<string, unknown>)))
  })

  return router
}
