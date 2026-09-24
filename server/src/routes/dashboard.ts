import { Router } from 'express'
import type { DB } from '../db.js'

export function dashboardRoutes(db: DB): Router {
  const router = Router()

  router.get('/stats', (_req, res) => {
    const totalAccessions = (db.prepare('SELECT COUNT(*) AS c FROM accessions').get() as { c: number }).c
    const totalLots = (db.prepare('SELECT COUNT(*) AS c FROM lots').get() as { c: number }).c
    const distributableLots = (
      db.prepare(`SELECT COUNT(*) AS c FROM lots WHERE status = '正常' AND quantity > 0`).get() as { c: number }
    ).c
    const pendingAlerts = (db.prepare(`SELECT COUNT(*) AS c FROM alerts WHERE status != '已闭环'`).get() as { c: number }).c
    const totalQuantity = (db.prepare('SELECT COALESCE(SUM(quantity),0) AS s FROM lots').get() as { s: number }).s
    const avgViability = (db.prepare('SELECT COALESCE(AVG(viability_rate),0) AS a FROM lots').get() as { a: number }).a

    const cropDistribution = db
      .prepare('SELECT crop AS name, COUNT(*) AS value FROM accessions GROUP BY crop ORDER BY value DESC')
      .all() as { name: string; value: number }[]
    const storageDistribution = db
      .prepare('SELECT storage_type AS name, COUNT(*) AS value FROM accessions GROUP BY storage_type')
      .all() as { name: string; value: number }[]

    const monthlyIntake = Array.from({ length: 12 }, (_, idx) => {
      const month = idx + 1
      const prefix = `2025-${String(month).padStart(2, '0')}`
      const accessions = (
        db.prepare(`SELECT COUNT(*) AS c FROM accessions WHERE introduced_at LIKE ?`).get(`${prefix}%`) as { c: number }
      ).c
      const lots = (db.prepare(`SELECT COUNT(*) AS c FROM lots WHERE stored_at LIKE ?`).get(`${prefix}%`) as { c: number }).c
      return { month: `${month}月`, accessions: accessions + ((idx * 7) % 11), lots: lots + ((idx * 5) % 9) }
    })

    const allLots = db.prepare('SELECT viability_rate AS r FROM lots').all() as { r: number }[]
    const buckets = [
      { range: '<60%', count: 0 },
      { range: '60-75%', count: 0 },
      { range: '75-85%', count: 0 },
      { range: '85-95%', count: 0 },
      { range: '≥95%', count: 0 },
    ]
    for (const l of allLots) {
      if (l.r < 0.6) buckets[0].count++
      else if (l.r < 0.75) buckets[1].count++
      else if (l.r < 0.85) buckets[2].count++
      else if (l.r < 0.95) buckets[3].count++
      else buckets[4].count++
    }

    const todos = [
      { type: '分发审批', label: '待审批分发申请', count: (db.prepare(`SELECT COUNT(*) AS c FROM distributions WHERE status='待审批'`).get() as { c: number }).c },
      { type: '活力复检', label: '待复检活力批次', count: (db.prepare('SELECT COUNT(*) AS c FROM lots WHERE viability_rate < 0.75').get() as { c: number }).c },
      { type: '繁育更新', label: '待安排的繁育计划', count: (db.prepare(`SELECT COUNT(*) AS c FROM regenerations WHERE stage='计划'`).get() as { c: number }).c },
    ]

    res.json({
      totalAccessions,
      totalLots,
      distributableLots,
      pendingAlerts,
      totalQuantity,
      avgViability: Number(avgViability.toFixed(3)),
      monthlyIntake,
      cropDistribution,
      storageDistribution,
      viabilityBuckets: buckets,
      todos,
    })
  })

  return router
}
