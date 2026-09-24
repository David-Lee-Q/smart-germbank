import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import { calcPureLiveSeed, determineLotStatus, DomainError } from '../lib/calc.js'
import { toLot } from '../lib/mappers.js'
import { createAlert, nextId, today, writeAudit } from '../lib/util.js'

const createSchema = z.object({
  accessionId: z.string().min(1),
  storageType: z.string().min(1),
  room: z.string().min(1),
  cabinet: z.string().min(1),
  layer: z.string().min(1),
  position: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  thousandGrainWeight: z.number().nonnegative().optional().default(0),
  moisture: z.number().nonnegative().optional().default(0),
  viabilityRate: z.number().min(0).max(1).optional().default(1),
  criticalAmount: z.number().int().positive().optional().default(100),
})

function assertLocationFree(db: DB, loc: { room: string; cabinet: string; layer: string; position: string }, excludeId?: string) {
  const row = db
    .prepare(
      `SELECT id FROM lots WHERE room=? AND cabinet=? AND layer=? AND position=? AND status != '耗尽' AND id != ? LIMIT 1`,
    )
    .get(loc.room, loc.cabinet, loc.layer, loc.position, excludeId ?? '') as { id: string } | undefined
  if (row) throw new DomainError('LOCATION_OCCUPIED', `货位已被批次 ${row.id} 占用`, 409)
}

export function inventoryRoutes(db: DB): Router {
  const router = Router()

  router.get('/', (req, res) => {
    const { keyword, storageType, status } = req.query as Record<string, string | undefined>
    const clauses: string[] = []
    const params: unknown[] = []
    if (keyword) {
      clauses.push('(id LIKE ? OR accession_id LIKE ?)')
      const k = `%${keyword}%`
      params.push(k, k)
    }
    if (storageType) {
      clauses.push('storage_type = ?')
      params.push(storageType)
    }
    if (status) {
      clauses.push('status = ?')
      params.push(status)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db.prepare(`SELECT * FROM lots ${where} ORDER BY id`).all(...(params as never[]))
    res.json(rows.map((r) => toLot(r as Record<string, unknown>)))
  })

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id)
    if (!row) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)
    res.json(toLot(row as Record<string, unknown>))
  })

  router.post('/', (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const d = parsed.data
    const acc = db.prepare('SELECT id FROM accessions WHERE id = ?').get(d.accessionId)
    if (!acc) throw new DomainError('ACCESSION_NOT_FOUND', '关联种质不存在', 404)
    assertLocationFree(db, d)
    const id = nextId('LOT')
    const status = determineLotStatus(d.quantity, d.criticalAmount)
    db.prepare(
      `INSERT INTO lots (id,accession_id,storage_type,room,cabinet,layer,position,quantity,unit,thousand_grain_weight,moisture,stored_at,viability_rate,pure_live_seed,critical_amount,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      d.accessionId,
      d.storageType,
      d.room,
      d.cabinet,
      d.layer,
      d.position,
      d.quantity,
      '粒',
      d.thousandGrainWeight,
      d.moisture,
      today(),
      d.viabilityRate,
      calcPureLiveSeed(d.quantity, d.viabilityRate),
      d.criticalAmount,
      status,
    )
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '创建库存批次', 'InventoryLot', id, req.ip ?? '127.0.0.1')
    const created = db.prepare('SELECT * FROM lots WHERE id = ?').get(id)
    res.status(201).json(toLot(created as Record<string, unknown>))
  })

  router.post('/:id/outbound', (req, res) => {
    const parsed = z.object({ quantity: z.number().int().positive(), reason: z.string().optional() }).safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', '出库数量必须为正整数')
    const row = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!row) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)
    const lot = toLot(row)
    if (parsed.data.quantity > lot.quantity) {
      throw new DomainError('INSUFFICIENT_STOCK', `出库数量超过可用数量 ${lot.quantity}${lot.unit}`, 409)
    }
    const quantity = lot.quantity - parsed.data.quantity
    const pureLiveSeed = calcPureLiveSeed(quantity, lot.viabilityRate)
    const status = lot.status === '封存' ? '封存' : determineLotStatus(quantity, lot.criticalAmount)
    db.prepare('UPDATE lots SET quantity=?, pure_live_seed=?, status=? WHERE id=?').run(quantity, pureLiveSeed, status, lot.id)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '执行出库', 'InventoryLot', lot.id, req.ip ?? '127.0.0.1')
    if (status === '偏低' || status === '耗尽') {
      createAlert(db, {
        type: '库存不足',
        level: status === '耗尽' ? '严重' : '警告',
        target: lot.accessionId,
        targetId: lot.id,
        description: `批次 ${lot.id} 出库后库存${status === '耗尽' ? '耗尽' : '低于临界量'}：剩余 ${quantity}${lot.unit}。`,
      })
    }
    const updated = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot.id)
    res.json(toLot(updated as Record<string, unknown>))
  })

  router.post('/:id/move', (req, res) => {
    const parsed = z
      .object({ room: z.string().min(1), cabinet: z.string().min(1), layer: z.string().min(1), position: z.string().min(1) })
      .safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', '货位信息不完整')
    const row = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!row) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)
    assertLocationFree(db, parsed.data, req.params.id)
    const lot = toLot(row)
    db.prepare('UPDATE lots SET room=?, cabinet=?, layer=?, position=? WHERE id=?').run(
      parsed.data.room,
      parsed.data.cabinet,
      parsed.data.layer,
      parsed.data.position,
      lot.id,
    )
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '移库', 'InventoryLot', lot.id, req.ip ?? '127.0.0.1')
    const updated = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot.id)
    res.json(toLot(updated as Record<string, unknown>))
  })

  router.post('/:id/stocktake', (req, res) => {
    const parsed = z.object({ actualQuantity: z.number().int().nonnegative(), reason: z.string().optional() }).safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', '实盘数量必须为非负整数')
    const row = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!row) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)
    const lot = toLot(row)
    const diff = parsed.data.actualQuantity - lot.quantity
    const pureLiveSeed = calcPureLiveSeed(parsed.data.actualQuantity, lot.viabilityRate)
    const status = lot.status === '封存' ? '封存' : determineLotStatus(parsed.data.actualQuantity, lot.criticalAmount)
    db.prepare('UPDATE lots SET quantity=?, pure_live_seed=?, status=? WHERE id=?').run(parsed.data.actualQuantity, pureLiveSeed, status, lot.id)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '库存盘点', 'InventoryLot', lot.id, req.ip ?? '127.0.0.1')
    res.json({ lotId: lot.id, bookQuantity: lot.quantity, actualQuantity: parsed.data.actualQuantity, diff, reason: parsed.data.reason ?? '' })
  })

  return router
}
