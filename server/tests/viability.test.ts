import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

async function pickLot() {
  const res = await request(app).get('/api/inventory').query({ status: '正常' })
  return res.body.find((l: { quantity: number }) => l.quantity > 0)
}

describe('GET /api/viability 检测记录', () => {
  it('返回检测列表', async () => {
    const res = await request(app).get('/api/viability')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })
})

describe('POST /api/viability 登记活力检测', () => {
  it('计算活力率并回写批次纯活种子', async () => {
    const lot = await pickLot()
    const res = await request(app).post('/api/viability').send({
      lotId: lot.id,
      method: '发芽试验',
      replicates: 4,
      seedsPerReplicate: 50,
      counts: [45, 48, 44, 46],
      tester: '测试员',
    })
    expect(res.status).toBe(201)
    expect(res.body.test.viabilityRate).toBe(0.92)
    expect(res.body.test.germinated).toBe(183)
    expect(res.body.lot.viabilityRate).toBe(0.92)
    expect(res.body.lot.pureLiveSeed).toBe(Math.round(res.body.lot.quantity * 0.92))
  })

  it('发芽数条目超过重复数时返回 400', async () => {
    const lot = await pickLot()
    const res = await request(app).post('/api/viability').send({
      lotId: lot.id,
      method: '发芽试验',
      replicates: 2,
      seedsPerReplicate: 50,
      counts: [10, 10, 10],
    })
    expect(res.status).toBe(400)
  })

  it('单重复发芽数超过取样数时返回 400', async () => {
    const lot = await pickLot()
    const res = await request(app).post('/api/viability').send({
      lotId: lot.id,
      method: '发芽试验',
      replicates: 2,
      seedsPerReplicate: 50,
      counts: [60, 10],
    })
    expect(res.status).toBe(400)
  })

  it('批次不存在时返回 404', async () => {
    const res = await request(app).post('/api/viability').send({
      lotId: 'LOT-NOPE',
      method: '发芽试验',
      replicates: 2,
      seedsPerReplicate: 50,
      counts: [10, 20],
    })
    expect(res.status).toBe(404)
  })

  it('低活力结果会生成活力下降预警', async () => {
    const lot = await pickLot()
    await request(app).post('/api/viability').send({
      lotId: lot.id,
      method: '发芽试验',
      replicates: 2,
      seedsPerReplicate: 50,
      counts: [20, 20],
    })
    const alerts = await request(app).get('/api/alerts').query({ type: '活力下降' })
    expect(alerts.body.some((a: { targetId: string }) => a.targetId === lot.id)).toBe(true)
  })
})

describe('GET /api/viability/overdue 待复检', () => {
  it('返回需要复检的批次', async () => {
    const res = await request(app).get('/api/viability/overdue')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.every((o: { lot: unknown }) => o.lot)).toBe(true)
  })
})
