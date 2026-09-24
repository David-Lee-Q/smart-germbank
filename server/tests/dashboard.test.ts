import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

describe('GET /api/dashboard/stats 驾驶舱统计', () => {
  it('返回核心指标与图表数据', async () => {
    const res = await request(app).get('/api/dashboard/stats')
    expect(res.status).toBe(200)
    for (const key of ['totalAccessions', 'totalLots', 'distributableLots', 'pendingAlerts', 'totalQuantity', 'avgViability']) {
      expect(res.body).toHaveProperty(key)
    }
    expect(Array.isArray(res.body.monthlyIntake)).toBe(true)
    expect(res.body.monthlyIntake).toHaveLength(12)
    expect(res.body.cropDistribution.length).toBeGreaterThan(0)
    expect(res.body.storageDistribution.length).toBeGreaterThan(0)
    expect(res.body.viabilityBuckets).toHaveLength(5)
    expect(res.body.todos).toHaveLength(3)
  })

  it('种质总数与列表数量一致', async () => {
    const list = await request(app).get('/api/accessions')
    const stats = await request(app).get('/api/dashboard/stats')
    expect(stats.body.totalAccessions).toBe(list.body.length)
  })

  it('平均活力率在 0~1 之间', async () => {
    const res = await request(app).get('/api/dashboard/stats')
    expect(res.body.avgViability).toBeGreaterThanOrEqual(0)
    expect(res.body.avgViability).toBeLessThanOrEqual(1)
  })
})
