import { Router } from 'express'
import { z } from 'zod'
import type { DB } from '../db.js'
import { toAccession, toDistribution, toLot, toRegeneration, toViabilityTest } from '../lib/mappers.js'
import { nextId, today, writeAudit } from '../lib/util.js'
import { DomainError } from '../lib/calc.js'

const createSchema = z.object({
  name: z.string().min(1, '种质名称不能为空'),
  scientificName: z.string().min(1, '学名不能为空'),
  family: z.string().optional().default(''),
  genus: z.string().optional().default(''),
  crop: z.string().min(1),
  sourceType: z.string().min(1),
  country: z.string().optional().default('中国'),
  region: z.string().optional().default(''),
  latitude: z.number().optional().default(0),
  longitude: z.number().optional().default(0),
  altitude: z.number().optional().default(0),
  collector: z.string().optional().default(''),
  collectedAt: z.string().optional().default(''),
  storageType: z.string().min(1),
  description: z.string().optional().default(''),
})

export function accessionRoutes(db: DB): Router {
  const router = Router()

  router.get('/', (req, res) => {
    const { keyword, crop, sourceType, storageType, status } = req.query as Record<string, string | undefined>
    const clauses: string[] = []
    const params: unknown[] = []
    if (keyword) {
      clauses.push('(id LIKE ? OR name LIKE ? OR scientific_name LIKE ? OR region LIKE ? OR collector LIKE ?)')
      const k = `%${keyword}%`
      params.push(k, k, k, k, k)
    }
    if (crop) {
      clauses.push('crop = ?')
      params.push(crop)
    }
    if (sourceType) {
      clauses.push('source_type = ?')
      params.push(sourceType)
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
    const rows = db.prepare(`SELECT * FROM accessions ${where} ORDER BY id`).all(...(params as never[]))
    res.json(rows.map((r) => toAccession(r as Record<string, unknown>)))
  })

  router.get('/export', (req, res) => {
    const { keyword, crop, sourceType, storageType, status } = req.query as Record<string, string | undefined>
    const clauses: string[] = []
    const params: unknown[] = []
    if (keyword) {
      clauses.push('(id LIKE ? OR name LIKE ? OR scientific_name LIKE ?)')
      const k = `%${keyword}%`
      params.push(k, k, k)
    }
    if (crop) {
      clauses.push('crop = ?')
      params.push(crop)
    }
    if (sourceType) {
      clauses.push('source_type = ?')
      params.push(sourceType)
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
    const rows = db.prepare(`SELECT * FROM accessions ${where} ORDER BY id`).all(...(params as never[]))
    const header = '种质编号,名称,学名,作物,来源类型,来源地,采集人,保存类型,状态'
    const lines = rows.map((r) => {
      const a = toAccession(r as Record<string, unknown>)
      return [a.id, a.name, a.scientificName, a.crop, a.sourceType, a.region, a.collector, a.storageType, a.status].join(',')
    })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="accessions.csv"')
    res.send('\ufeff' + [header, ...lines].join('\n'))
  })

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM accessions WHERE id = ?').get(req.params.id)
    if (!row) throw new DomainError('NOT_FOUND', '种质不存在', 404)
    res.json(toAccession(row as Record<string, unknown>))
  })

  router.post('/', (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const d = parsed.data
    const id = nextId('GZ').replace('GZ-', 'GZ-')
    db.prepare(
      `INSERT INTO accessions (id,name,scientific_name,family,genus,crop,source_type,country,region,latitude,longitude,altitude,collector,collected_at,storage_type,status,introduced_at,description)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      d.name,
      d.scientificName,
      d.family,
      d.genus,
      d.crop,
      d.sourceType,
      d.country,
      d.region,
      d.latitude,
      d.longitude,
      d.altitude,
      d.collector,
      d.collectedAt || today(),
      d.storageType,
      '待鉴定',
      today(),
      d.description,
    )
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '新增种质', 'Accession', id, req.ip ?? '127.0.0.1')
    const created = db.prepare('SELECT * FROM accessions WHERE id = ?').get(id)
    res.status(201).json(toAccession(created as Record<string, unknown>))
  })

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM accessions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!existing) throw new DomainError('NOT_FOUND', '种质不存在', 404)
    const parsed = createSchema.partial().safeParse(req.body)
    if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? '参数错误')
    const d = parsed.data
    const merged = { ...toAccession(existing), ...d }
    if (!merged.name || !merged.scientificName) throw new DomainError('VALIDATION_ERROR', '种质名称与学名不能为空')
    db.prepare(
      `UPDATE accessions SET name=?, scientific_name=?, family=?, genus=?, crop=?, source_type=?, country=?, region=?, latitude=?, longitude=?, altitude=?, collector=?, collected_at=?, storage_type=?, description=? WHERE id=?`,
    ).run(
      merged.name,
      merged.scientificName,
      merged.family,
      merged.genus,
      merged.crop,
      merged.sourceType,
      merged.country,
      merged.region,
      merged.latitude,
      merged.longitude,
      merged.altitude,
      merged.collector,
      merged.collectedAt,
      merged.storageType,
      merged.description,
      req.params.id,
    )
    writeAudit(db, req.header('x-operator') ?? '系统管理员', '修改种质', 'Accession', req.params.id, req.ip ?? '127.0.0.1')
    const updated = db.prepare('SELECT * FROM accessions WHERE id = ?').get(req.params.id)
    res.json(toAccession(updated as Record<string, unknown>))
  })

  router.get('/:id/lots', (req, res) => {
    const rows = db.prepare('SELECT * FROM lots WHERE accession_id = ? ORDER BY id').all(req.params.id)
    res.json(rows.map((r) => toLot(r as Record<string, unknown>)))
  })

  router.get('/:id/viability', (req, res) => {
    const rows = db.prepare('SELECT * FROM viability_tests WHERE accession_id = ? ORDER BY tested_at DESC').all(req.params.id)
    res.json(rows.map((r) => toViabilityTest(r as Record<string, unknown>)))
  })

  router.get('/:id/regenerations', (req, res) => {
    const rows = db.prepare('SELECT * FROM regenerations WHERE accession_id = ? ORDER BY id').all(req.params.id)
    res.json(rows.map((r) => toRegeneration(r as Record<string, unknown>)))
  })

  router.get('/:id/distributions', (req, res) => {
    const rows = db.prepare('SELECT * FROM distributions WHERE accession_id = ? ORDER BY applied_at DESC').all(req.params.id)
    res.json(rows.map((r) => toDistribution(r as Record<string, unknown>)))
  })

  router.get('/:id/timeline', (req, res) => {
    const acc = db.prepare('SELECT * FROM accessions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!acc) throw new DomainError('NOT_FOUND', '种质不存在', 404)
    const a = toAccession(acc)
    const events: { date: string; title: string; desc: string }[] = [
      { date: a.collectedAt, title: '野外采集', desc: `${a.collector} 于 ${a.region} 采集` },
      { date: a.introducedAt, title: '引种入库', desc: `保存类型：${a.storageType}` },
    ]
    for (const l of db.prepare('SELECT * FROM lots WHERE accession_id = ?').all(req.params.id)) {
      const lot = toLot(l as Record<string, unknown>)
      events.push({ date: lot.storedAt, title: '创建库存批次', desc: `${lot.id} · ${lot.room}/${lot.cabinet}/${lot.layer}/${lot.position}` })
    }
    for (const t of db.prepare('SELECT * FROM viability_tests WHERE accession_id = ?').all(req.params.id)) {
      const test = toViabilityTest(t as Record<string, unknown>)
      events.push({ date: test.testedAt, title: '活力检测', desc: `${test.method} · 活力率 ${(test.viabilityRate * 100).toFixed(0)}%` })
    }
    events.sort((x, y) => (x.date < y.date ? 1 : -1))
    res.json(events)
  })

  return router
}
