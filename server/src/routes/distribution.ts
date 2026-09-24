import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import { calcPureLiveSeed, determineLotStatus, DomainError } from '../lib/calc.js'
import { toDistribution, toLot } from '../lib/mappers.js'
import { createAlert, nextId, today, writeAudit } from '../lib/util.js'

const applySchema = z.object({
  accessionId: z.string().min(1),
  lotId: z.string().min(1),
  applicant: z.string().min(1),
  organization: z.string().min(1),
  quantity: z.number().int().positive(),
  purpose: z.string().min(1),
})

export function distributionRoutes(db: DB): Router {
  const router = Router()

  router.get('/', (req, res) => {
    const { status } = req.query as { status?: string }
    const rows = status
      ? db.prepare('SELECT * FROM distributions WHERE status = ? ORDER BY applied_at DESC').all(status)
      : db.prepare('SELECT * FROM distributions ORDER BY applied_at DESC').all()
    res.json(rows.map((r) => toDistribution(r as Record<string, unknown>)))
  })

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM distributions WHERE id = ?').get(req.params.id)
    if (!row) throw new DomainError('NOT_FOUND', '分发申请不存在', 404)
    res.json(toDistribution(row as Record<string, unknown>))
  })

  router.post('/', (req, res) => {
    const parsed = applySchema.safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const d = parsed.data
    const lotRow = db.prepare('SELECT * FROM lots WHERE id = ?').get(d.lotId) as Record<string, unknown> | undefined
    if (!lotRow) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)
    const lot = toLot(lotRow)
    if (lot.accessionId !== d.accessionId) throw new DomainError('ACCESSION_MISMATCH', '种质与批次不匹配')
    if (d.quantity > lot.quantity) throw new DomainError('INSUFFICIENT_STOCK', `申请数量超过批次可用数量 ${lot.quantity}${lot.unit}`, 409)
    const acc = db.prepare('SELECT status FROM accessions WHERE id = ?').get(d.accessionId) as { status: string } | undefined
    if (acc && (acc.status === '暂停分发' || acc.status === '已注销')) {
      throw new DomainError('NOT_DISTRIBUTABLE', `种质状态为「${acc.status}」，不可分发`, 409)
    }
    const id = nextId('DR')
    db.prepare(
      `INSERT INTO distributions (id,accession_id,lot_id,applicant,organization,quantity,purpose,status,applied_at,review_comment)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, d.accessionId, d.lotId, d.applicant, d.organization, d.quantity, d.purpose, '待审批', today(), null)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '提交分发申请', 'DistributionRequest', id, req.ip ?? '127.0.0.1')
    const created = db.prepare('SELECT * FROM distributions WHERE id = ?').get(id)
    res.status(201).json(toDistribution(created as Record<string, unknown>))
  })

  router.post('/:id/approve', (req, res) => {
    const parsed = z.object({ comment: z.string().optional() }).safeParse(req.body ?? {})
    const row = db.prepare('SELECT * FROM distributions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!row) throw new DomainError('NOT_FOUND', '分发申请不存在', 404)
    const dist = toDistribution(row)
    if (dist.status !== '待审批') throw new DomainError('INVALID_STATE', `当前状态为「${dist.status}」，仅待审批可批准`, 409)
    db.prepare('UPDATE distributions SET status=?, review_comment=? WHERE id=?').run('已批准', parsed.success ? (parsed.data.comment ?? '同意分发') : '同意分发', dist.id)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '审批分发申请', 'DistributionRequest', dist.id, req.ip ?? '127.0.0.1')
    const updated = db.prepare('SELECT * FROM distributions WHERE id = ?').get(dist.id)
    res.json(toDistribution(updated as Record<string, unknown>))
  })

  router.post('/:id/reject', (req, res) => {
    const parsed = z.object({ reason: z.string().min(1, '驳回原因不能为空') }).safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const row = db.prepare('SELECT * FROM distributions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!row) throw new DomainError('NOT_FOUND', '分发申请不存在', 404)
    const dist = toDistribution(row)
    if (dist.status !== '待审批') throw new DomainError('INVALID_STATE', `当前状态为「${dist.status}」，仅待审批可驳回`, 409)
    db.prepare('UPDATE distributions SET status=?, review_comment=? WHERE id=?').run('已驳回', parsed.data.reason, dist.id)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '驳回分发申请', 'DistributionRequest', dist.id, req.ip ?? '127.0.0.1')
    const updated = db.prepare('SELECT * FROM distributions WHERE id = ?').get(dist.id)
    res.json(toDistribution(updated as Record<string, unknown>))
  })

  router.post('/:id/ship', (req, res) => {
    const row = db.prepare('SELECT * FROM distributions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!row) throw new DomainError('NOT_FOUND', '分发申请不存在', 404)
    const dist = toDistribution(row)
    if (dist.status !== '已批准') throw new DomainError('INVALID_STATE', `当前状态为「${dist.status}」，仅已批准可分发`, 409)
    const lotRow = db.prepare('SELECT * FROM lots WHERE id = ?').get(dist.lotId) as Record<string, unknown> | undefined
    if (!lotRow) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)
    const lot = toLot(lotRow)
    if (dist.quantity > lot.quantity) throw new DomainError('INSUFFICIENT_STOCK', `库存不足，可用 ${lot.quantity}${lot.unit}`, 409)

    const quantity = lot.quantity - dist.quantity
    const pureLiveSeed = calcPureLiveSeed(quantity, lot.viabilityRate)
    const status = lot.status === '封存' ? '封存' : determineLotStatus(quantity, lot.criticalAmount)
    db.prepare('UPDATE lots SET quantity=?, pure_live_seed=?, status=? WHERE id=?').run(quantity, pureLiveSeed, status, lot.id)
    db.prepare('UPDATE distributions SET status=? WHERE id=?').run('已分发', dist.id)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '执行分发', 'DistributionRequest', dist.id, req.ip ?? '127.0.0.1')

    if (status === '偏低' || status === '耗尽') {
      createAlert(db, {
        type: '库存不足',
        level: status === '耗尽' ? '严重' : '警告',
        target: dist.accessionId,
        targetId: lot.id,
        description: `分发 ${dist.id} 后批次 ${lot.id} 库存${status === '耗尽' ? '耗尽' : '低于临界量'}：剩余 ${quantity}${lot.unit}。`,
      })
    }

    const updatedDist = db.prepare('SELECT * FROM distributions WHERE id = ?').get(dist.id)
    const updatedLot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot.id)
    res.json({ distribution: toDistribution(updatedDist as Record<string, unknown>), lot: toLot(updatedLot as Record<string, unknown>) })
  })

  return router
}
