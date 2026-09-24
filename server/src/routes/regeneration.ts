import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import { calcPureLiveSeed, determineLotStatus, DomainError } from '../lib/calc.js'
import { toLot, toRegeneration } from '../lib/mappers.js'
import { nextId, today, writeAudit } from '../lib/util.js'

const STAGES = ['计划', '播种', '田间管理', '收获', '入库', '已关闭'] as const

const createSchema = z.object({
  accessionId: z.string().min(1),
  reason: z.string().min(1),
  plannedQuantity: z.number().int().positive(),
  plot: z.string().min(1),
  owner: z.string().optional().default(''),
  sowingDate: z.string().optional(),
  expectedHarvest: z.string().optional().default(''),
})

export function regenerationRoutes(db: DB): Router {
  const router = Router()

  router.get('/', (req, res) => {
    const { stage } = req.query as { stage?: string }
    const rows = stage
      ? db.prepare('SELECT * FROM regenerations WHERE stage = ? ORDER BY id').all(stage)
      : db.prepare('SELECT * FROM regenerations ORDER BY id').all()
    res.json(rows.map((r) => toRegeneration(r as Record<string, unknown>)))
  })

  router.get('/board', (_req, res) => {
    const rows = db.prepare('SELECT * FROM regenerations ORDER BY id').all()
    const board = STAGES.map((stage) => ({
      stage,
      items: rows.map((r) => toRegeneration(r as Record<string, unknown>)).filter((r) => r.stage === stage),
    }))
    res.json(board)
  })

  router.post('/', (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const d = parsed.data
    const acc = db.prepare('SELECT id FROM accessions WHERE id = ?').get(d.accessionId)
    if (!acc) throw new DomainError('ACCESSION_NOT_FOUND', '关联种质不存在', 404)
    const id = nextId('RG')
    db.prepare(
      `INSERT INTO regenerations (id,accession_id,reason,planned_quantity,plot,stage,owner,sowing_date,expected_harvest,actual_harvest)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, d.accessionId, d.reason, d.plannedQuantity, d.plot, '计划', d.owner || '未指派', d.sowingDate || today(), d.expectedHarvest, null)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '创建繁育计划', 'Regeneration', id, req.ip ?? '127.0.0.1')
    const created = db.prepare('SELECT * FROM regenerations WHERE id = ?').get(id)
    res.status(201).json(toRegeneration(created as Record<string, unknown>))
  })

  router.post('/:id/advance', (req, res) => {
    const row = db.prepare('SELECT * FROM regenerations WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!row) throw new DomainError('NOT_FOUND', '繁育单不存在', 404)
    const regen = toRegeneration(row)
    const idx = STAGES.indexOf(regen.stage as (typeof STAGES)[number])
    if (idx >= STAGES.length - 1) throw new DomainError('STAGE_END', '该繁育单已关闭，无法推进', 409)
    const nextStage = STAGES[idx + 1]

    let newLot: ReturnType<typeof toLot> | null = null
    if (nextStage === '入库') {
      const acc = db.prepare('SELECT * FROM accessions WHERE id = ?').get(regen.accessionId) as Record<string, unknown>
      const harvest = regen.actualHarvest ?? regen.plannedQuantity
      const lotId = nextId('LOT')
      const storageType = acc.storage_type as string
      const criticalAmount = 100
      const viabilityRate = 0.9
      db.prepare(
        `INSERT INTO lots (id,accession_id,storage_type,room,cabinet,layer,position,quantity,unit,thousand_grain_weight,moisture,stored_at,viability_rate,pure_live_seed,critical_amount,status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        lotId,
        regen.accessionId,
        storageType,
        `${storageType}-A库`,
        `柜${String((idx + 1) * 3).padStart(2, '0')}`,
        '第1层',
        '位01',
        harvest,
        '粒',
        0,
        5,
        today(),
        viabilityRate,
        calcPureLiveSeed(harvest, viabilityRate),
        criticalAmount,
        determineLotStatus(harvest, criticalAmount),
      )
      const lotRow = db.prepare('SELECT * FROM lots WHERE id = ?').get(lotId)
      newLot = toLot(lotRow as Record<string, unknown>)
      db.prepare('UPDATE regenerations SET stage=?, actual_harvest=COALESCE(actual_harvest, ?) WHERE id=?').run(nextStage, harvest, regen.id)
    } else {
      db.prepare('UPDATE regenerations SET stage=? WHERE id=?').run(nextStage, regen.id)
    }

    writeAudit(db, req.header('x-operator') ?? '系统管理员', '推进繁育阶段', 'Regeneration', regen.id, req.ip ?? '127.0.0.1')
    const updated = db.prepare('SELECT * FROM regenerations WHERE id = ?').get(regen.id)
    res.json({ regeneration: toRegeneration(updated as Record<string, unknown>), newLot })
  })

  return router
}
