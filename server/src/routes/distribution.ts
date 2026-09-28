import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import type { DistributionRequest } from '../types.js'
import { calcPureLiveSeed, determineLotStatus, DomainError } from '../lib/calc.js'
import { toDistribution, toLot, toApprovalNode } from '../lib/mappers.js'
import { createAlert, nextId, today, writeAudit } from '../lib/util.js'

const applySchema = z.object({
  accessionId: z.string().min(1),
  lotId: z.string().min(1),
  applicant: z.string().min(1),
  organization: z.string().min(1),
  quantity: z.number().int().positive(),
  purpose: z.string().min(1),
})

const actSchema = z.object({
  approver: z.string().optional(),
  comment: z.string().optional(),
  reason: z.string().min(1, '驳回原因不能为空').optional(),
})

interface ApprovalRow {
  id: string
  round: number
  seq: number
  node_name: string
  role: string
}

export function withDistributionApprovals(db: DB, dists: DistributionRequest[]): DistributionRequest[] {
  if (dists.length === 0) return dists
  const placeholders = dists.map(() => '?').join(',')
  const rows = db
    .prepare(
      `SELECT * FROM distribution_approvals WHERE distribution_id IN (${placeholders}) ORDER BY round ASC, seq ASC`,
    )
    .all(...dists.map((d) => d.id)) as Record<string, unknown>[]
  const byId = new Map<string, ReturnType<typeof toApprovalNode>[]>([])
  for (const r of rows) {
    const distId = r.distribution_id as string
    const list = byId.get(distId) ?? []
    list.push(toApprovalNode(r))
    byId.set(distId, list)
  }
  return dists.map((d) => ({ ...d, approvals: byId.get(d.id) ?? [] }))
}

export function distributionRoutes(db: DB): Router {
  const router = Router()

  const APPROVAL_CHAIN: { seq: number; node_name: string; role: string }[] = [
    { seq: 1, node_name: '库管员初审', role: '库管员' },
    { seq: 2, node_name: '库负责人审批', role: '库负责人' },
    { seq: 3, node_name: '分发执行', role: '库管员' },
  ]

  const ROLE_DEFAULT_APPROVER: Record<string, string> = { 库管员: '张伟', 库负责人: '王强' }

  function tx(fn: () => void) {
    db.exec('BEGIN')
    try {
      fn()
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }

  function insertNode(
    distributionId: string,
    round: number,
    seq: number,
    nodeName: string,
    role: string,
    approver: string,
    comment: string | null,
    status: string,
    actedAt: string | null,
  ) {
    db.prepare(
      `INSERT INTO distribution_approvals (id,distribution_id,round,seq,node_name,role,approver,comment,status,acted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(nextId('AP'), distributionId, round, seq, nodeName, role, approver, comment, status, actedAt)
  }

  function createRoundNodes(distributionId: string, round: number, applicant: string, comment: string | null, actedAt: string) {
    insertNode(distributionId, round, 0, round === 1 ? '申请提交' : '重新提交', '申请人', applicant, comment, '已提交', actedAt)
    for (const n of APPROVAL_CHAIN) {
      insertNode(distributionId, round, n.seq, n.node_name, n.role, ROLE_DEFAULT_APPROVER[n.role] ?? applicant, null, '待处理', null)
    }
  }

  function getDistributionOrThrow(id: string) {
    const row = db.prepare('SELECT * FROM distributions WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) throw new DomainError('NOT_FOUND', '分发申请不存在', 404)
    return toDistribution(row)
  }

  function currentRound(distributionId: string): number {
    const r = db
      .prepare('SELECT MAX(round) AS r FROM distribution_approvals WHERE distribution_id = ?')
      .get(distributionId) as { r: number | null } | undefined
    return r?.r ?? 0
  }

  function currentNode(distributionId: string): ApprovalRow | null {
    const round = currentRound(distributionId)
    if (round === 0) return null
    const row = db
      .prepare(
        `SELECT * FROM distribution_approvals
         WHERE distribution_id = ? AND round = ? AND seq IN (1,2,3) AND status = '待处理'
         ORDER BY seq ASC LIMIT 1`,
      )
      .get(distributionId, round) as ApprovalRow | undefined
    return row ?? null
  }

  function requireCurrentNode(distributionId: string) {
    const node = currentNode(distributionId)
    if (!node) throw new DomainError('INVALID_STATE', '当前没有待处理节点', 409)
    return node
  }

  function resolveApprover(input: unknown, role: string): string {
    const trimmed = typeof input === 'string' ? input.trim() : ''
    return trimmed || ROLE_DEFAULT_APPROVER[role] || '管理员'
  }

  function executeShip(dist: DistributionRequest): string {
    const lotRow = db.prepare('SELECT * FROM lots WHERE id = ?').get(dist.lotId) as Record<string, unknown> | undefined
    if (!lotRow) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)
    const lot = toLot(lotRow)
    if (dist.quantity > lot.quantity) {
      throw new DomainError('INSUFFICIENT_STOCK', `库存不足，可用 ${lot.quantity}${lot.unit}`, 409)
    }
    const quantity = lot.quantity - dist.quantity
    const pureLiveSeed = calcPureLiveSeed(quantity, lot.viabilityRate)
    const status = lot.status === '封存' ? '封存' : determineLotStatus(quantity, lot.criticalAmount)
    db.prepare('UPDATE lots SET quantity=?, pure_live_seed=?, status=? WHERE id=?').run(quantity, pureLiveSeed, status, lot.id)
    if (status === '偏低' || status === '耗尽') {
      createAlert(db, {
        type: '库存不足',
        level: status === '耗尽' ? '严重' : '警告',
        target: dist.accessionId,
        targetId: lot.id,
        description: `分发 ${dist.id} 后批次 ${lot.id} 库存${status === '耗尽' ? '耗尽' : '低于临界量'}：剩余 ${quantity}${lot.unit}。`,
      })
    }
    return lot.id
  }

  router.get('/', (req, res) => {
    const { status, keyword } = req.query as { status?: string; keyword?: string }
    let sql = 'SELECT * FROM distributions'
    const params: (string | number)[] = []
    const conds: string[] = []
    if (status && status !== '全部') {
      conds.push('status = ?')
      params.push(status)
    }
    if (keyword) {
      conds.push('(id LIKE ? OR applicant LIKE ? OR organization LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    if (conds.length) sql += ` WHERE ${conds.join(' AND ')}`
    sql += ' ORDER BY applied_at DESC'
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    res.json(withDistributionApprovals(db, rows.map((r) => toDistribution(r as Record<string, unknown>))))
  })

  router.get('/:id', (req, res) => {
    res.json(withDistributionApprovals(db, [getDistributionOrThrow(req.params.id)])[0])
  })

  router.post('/', (req, res) => {
    const parsed = applySchema.safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const d = parsed.data
    const lotRow = db.prepare('SELECT * FROM lots WHERE id = ?').get(d.lotId) as Record<string, unknown> | undefined
    if (!lotRow) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)
    const lot = toLot(lotRow)
    if (lot.accessionId !== d.accessionId) throw new DomainError('ACCESSION_MISMATCH', '种质与批次不匹配')
    if (d.quantity > lot.quantity) {
      throw new DomainError('INSUFFICIENT_STOCK', `申请数量超过批次可用数量 ${lot.quantity}${lot.unit}`, 409)
    }
    const acc = db.prepare('SELECT status FROM accessions WHERE id = ?').get(d.accessionId) as { status: string } | undefined
    if (acc && (acc.status === '暂停分发' || acc.status === '已注销')) {
      throw new DomainError('NOT_DISTRIBUTABLE', `种质状态为「${acc.status}」，不可分发`, 409)
    }
    const id = nextId('DR')
    const t = today()
    tx(() => {
      db.prepare(
        `INSERT INTO distributions (id,accession_id,lot_id,applicant,organization,quantity,purpose,status,applied_at,review_comment)
         VALUES (?,?,?,?,?,?,?, '待审批', ?, null)`,
      ).run(id, d.accessionId, d.lotId, d.applicant, d.organization, d.quantity, d.purpose, t)
      createRoundNodes(id, 1, d.applicant, null, t)
    })
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '提交分发申请', 'DistributionRequest', id, req.ip ?? '127.0.0.1')
    res.status(201).json(withDistributionApprovals(db, [getDistributionOrThrow(id)])[0])
  })

  function approveCurrent(dist: DistributionRequest, body: { approver?: string; comment?: string }, ip: string) {
    const node = requireCurrentNode(dist.id)
    const chain = APPROVAL_CHAIN.find((n) => n.seq === node.seq)
    const approver = resolveApprover(body.approver, chain?.role ?? '')
    const comment = body.comment && body.comment.trim() ? body.comment.trim() : null
    const t = today()
    tx(() => {
      db.prepare(
        `UPDATE distribution_approvals SET status = '已通过', approver = ?, comment = ?, acted_at = ? WHERE id = ?`,
      ).run(approver, comment, t, node.id)
      if (node.seq === 3) {
        executeShip(dist)
        db.prepare(`UPDATE distributions SET status = '已分发' WHERE id = ?`).run(dist.id)
      } else if (node.seq === 2) {
        db.prepare(`UPDATE distributions SET status = '已批准' WHERE id = ?`).run(dist.id)
      }
    })
    writeAudit(
      db,
      approver,
      node.seq === 3 ? '执行分发' : `审批分发节点「${node.node_name}」：通过`,
      'DistributionRequest',
      dist.id,
      ip ?? '127.0.0.1',
    )
    return withDistributionApprovals(db, [getDistributionOrThrow(dist.id)])[0]
  }

  router.post('/:id/approve', (req, res) => {
    const parsed = actSchema.safeParse(req.body ?? {})
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const dist = getDistributionOrThrow(req.params.id)
    res.json(approveCurrent(dist, parsed.data, req.ip ?? '127.0.0.1'))
  })

  router.post('/:id/reject', (req, res) => {
    const parsed = actSchema.safeParse(req.body ?? {})
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const dist = getDistributionOrThrow(req.params.id)
    const reason = (parsed.data.reason ?? parsed.data.comment ?? '').trim()
    if (!reason) throw new DomainError('VALIDATION_ERROR', '驳回原因不能为空')
    const node = requireCurrentNode(dist.id)
    const chain = APPROVAL_CHAIN.find((n) => n.seq === node.seq)
    const approver = resolveApprover(parsed.data.approver, chain?.role ?? '')
    const t = today()
    tx(() => {
      db.prepare(
        `UPDATE distribution_approvals SET status = '已驳回', approver = ?, comment = ?, acted_at = ? WHERE id = ?`,
      ).run(approver, reason, t, node.id)
      db.prepare(
        `UPDATE distribution_approvals SET status = '已终止'
         WHERE distribution_id = ? AND round = ? AND seq > ? AND status = '待处理'`,
      ).run(dist.id, node.round, node.seq)
      db.prepare(`UPDATE distributions SET status = '已驳回', review_comment = ? WHERE id = ?`).run(reason, dist.id)
    })
    writeAudit(db, approver, `审批分发节点「${node.node_name}」：驳回`, 'DistributionRequest', dist.id, req.ip ?? '127.0.0.1')
    res.json(withDistributionApprovals(db, [getDistributionOrThrow(dist.id)])[0])
  })

  router.post('/:id/resubmit', (req, res) => {
    const parsed = z.object({ comment: z.string().optional() }).safeParse(req.body ?? {})
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const dist = getDistributionOrThrow(req.params.id)
    if (dist.status !== '已驳回') {
      throw new DomainError('INVALID_STATE', `当前状态为「${dist.status}」，仅已驳回可重新提交`, 409)
    }
    const round = currentRound(dist.id) + 1
    const comment = (parsed.data.comment ?? '').trim() || null
    const t = today()
    tx(() => {
      createRoundNodes(dist.id, round, dist.applicant, comment, t)
      db.prepare(`UPDATE distributions SET status = '待审批' WHERE id = ?`).run(dist.id)
    })
    writeAudit(db, dist.applicant, '重新提交分发申请', 'DistributionRequest', dist.id, req.ip ?? '127.0.0.1')
    res.json(withDistributionApprovals(db, [getDistributionOrThrow(dist.id)])[0])
  })

  router.post('/:id/ship', (req, res) => {
    const parsed = actSchema.safeParse(req.body ?? {})
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const dist = getDistributionOrThrow(req.params.id)
    const node = currentNode(dist.id)
    if (!node || node.seq !== 3) {
      throw new DomainError('INVALID_STATE', '仅当前审批节点为「分发执行」时可执行分发', 409)
    }
    const updated = approveCurrent(dist, parsed.data, req.ip ?? '127.0.0.1')
    const lotRow = db.prepare('SELECT * FROM lots WHERE id = ?').get(dist.lotId) as Record<string, unknown>
    res.json({ distribution: updated, lot: toLot(lotRow) })
  })

  return router
}
