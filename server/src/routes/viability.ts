import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import { calcPureLiveSeed, calcViabilityRate, DomainError } from '../lib/calc.js'
import { toLot, toViabilityTest } from '../lib/mappers.js'
import { createAlert, nextId, today, writeAudit } from '../lib/util.js'

const createSchema = z.object({
  lotId: z.string().min(1),
  method: z.enum(['发芽试验', 'TTC染色', '四唑染色']),
  replicates: z.number().int().positive(),
  seedsPerReplicate: z.number().int().positive(),
  counts: z.array(z.number()).min(1),
  testedAt: z.string().optional(),
  tester: z.string().optional().default(''),
})

export function viabilityRoutes(db: DB): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    const rows = db.prepare('SELECT * FROM viability_tests ORDER BY tested_at DESC, id').all()
    res.json(rows.map((r) => toViabilityTest(r as Record<string, unknown>)))
  })

  router.get('/overdue', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT l.*, (SELECT MAX(tested_at) FROM viability_tests v WHERE v.lot_id = l.id) AS last_tested
         FROM lots l
         WHERE l.quantity > 0 AND (l.viability_rate < 0.75 OR last_tested IS NULL OR last_tested < date('now','-24 months'))
         ORDER BY l.viability_rate ASC`,
      )
      .all()
    res.json(
      rows.map((r) => {
        const row = r as Record<string, unknown>
        return { lot: toLot(row), lastTested: (row.last_tested as string | null) ?? null }
      }),
    )
  })

  router.post('/', (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const d = parsed.data
    const lotRow = db.prepare('SELECT * FROM lots WHERE id = ?').get(d.lotId) as Record<string, unknown> | undefined
    if (!lotRow) throw new DomainError('NOT_FOUND', '库存批次不存在', 404)

    const viabilityRate = calcViabilityRate(d.replicates, d.seedsPerReplicate, d.counts)
    const germinated = d.counts.reduce((a, b) => a + b, 0)
    const lot = toLot(lotRow)
    const id = nextId('VT')
    db.prepare(
      `INSERT INTO viability_tests (id,lot_id,accession_id,method,replicates,seeds_per_replicate,germinated,viability_rate,tested_at,tester)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, lot.id, lot.accessionId, d.method, d.replicates, d.seedsPerReplicate, germinated, viabilityRate, d.testedAt || today(), d.tester)

    const pureLiveSeed = calcPureLiveSeed(lot.quantity, viabilityRate)
    db.prepare('UPDATE lots SET viability_rate=?, pure_live_seed=? WHERE id=?').run(viabilityRate, pureLiveSeed, lot.id)
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '登记活力检测', 'ViabilityTest', id, req.ip ?? '127.0.0.1')

    if (viabilityRate < 0.75) {
      createAlert(db, {
        type: '活力下降',
        level: viabilityRate < 0.6 ? '严重' : '警告',
        target: lot.accessionId,
        targetId: lot.id,
        description: `批次 ${lot.id} 活力率降至 ${(viabilityRate * 100).toFixed(0)}%，建议安排复检与繁育更新。`,
      })
    }

    const test = db.prepare('SELECT * FROM viability_tests WHERE id = ?').get(id)
    const updatedLot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot.id)
    res.status(201).json({ test: toViabilityTest(test as Record<string, unknown>), lot: toLot(updatedLot as Record<string, unknown>) })
  })

  return router
}
