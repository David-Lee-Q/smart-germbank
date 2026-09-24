import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

async function firstAccessionId(): Promise<string> {
  const res = await request(app).get('/api/accessions')
  return res.body[0].id
}

describe('POST /api/inventory 创建库存批次', () => {
  it('成功创建并计算纯活种子与状态', async () => {
    const accessionId = await firstAccessionId()
    const res = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '中期库',
      room: '测试库-T1',
      cabinet: '柜T1',
      layer: '第1层',
      position: '位T1',
      quantity: 1000,
      viabilityRate: 0.8,
      criticalAmount: 200,
    })
    expect(res.status).toBe(201)
    expect(res.body.pureLiveSeed).toBe(800)
    expect(res.body.status).toBe('正常')
    expect(res.body.quantity).toBe(1000)
  })

  it('关联种质不存在时返回 404', async () => {
    const res = await request(app).post('/api/inventory').send({
      accessionId: 'GZ-NOPE',
      storageType: '中期库',
      room: '测试库-T2',
      cabinet: '柜T2',
      layer: '第1层',
      position: '位T2',
      quantity: 100,
    })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('ACCESSION_NOT_FOUND')
  })

  it('货位被占用时返回 409', async () => {
    const accessionId = await firstAccessionId()
    const payload = {
      accessionId,
      storageType: '中期库',
      room: '测试库-T3',
      cabinet: '柜T3',
      layer: '第1层',
      position: '位T3',
      quantity: 100,
    }
    const first = await request(app).post('/api/inventory').send(payload)
    expect(first.status).toBe(201)
    const second = await request(app).post('/api/inventory').send(payload)
    expect(second.status).toBe(409)
    expect(second.body.error.code).toBe('LOCATION_OCCUPIED')
  })
})

describe('POST /api/inventory/:id/outbound 出库', () => {
  it('成功出库并扣减库存与纯活种子', async () => {
    const accessionId = await firstAccessionId()
    const created = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '短期库',
      room: '测试库-O1',
      cabinet: '柜O1',
      layer: '第1层',
      position: '位O1',
      quantity: 1000,
      viabilityRate: 0.5,
      criticalAmount: 100,
    })
    const res = await request(app).post(`/api/inventory/${created.body.id}/outbound`).send({ quantity: 400 })
    expect(res.status).toBe(200)
    expect(res.body.quantity).toBe(600)
    expect(res.body.pureLiveSeed).toBe(300)
  })

  it('出库数量超过可用量时返回 409', async () => {
    const accessionId = await firstAccessionId()
    const created = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '短期库',
      room: '测试库-O2',
      cabinet: '柜O2',
      layer: '第1层',
      position: '位O2',
      quantity: 100,
      viabilityRate: 1,
      criticalAmount: 50,
    })
    const res = await request(app).post(`/api/inventory/${created.body.id}/outbound`).send({ quantity: 101 })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
  })

  it('出库后低于临界量会生成库存不足预警', async () => {
    const accessionId = await firstAccessionId()
    const created = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '短期库',
      room: '测试库-O3',
      cabinet: '柜O3',
      layer: '第1层',
      position: '位O3',
      quantity: 500,
      viabilityRate: 1,
      criticalAmount: 300,
    })
    const lotId = created.body.id
    await request(app).post(`/api/inventory/${lotId}/outbound`).send({ quantity: 300 })
    const alerts = await request(app).get('/api/alerts').query({ type: '库存不足' })
    expect(alerts.body.some((a: { targetId: string }) => a.targetId === lotId)).toBe(true)
  })
})

describe('POST /api/inventory/:id/move 移库', () => {
  it('成功移库并更新货位', async () => {
    const accessionId = await firstAccessionId()
    const created = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '中期库',
      room: '测试库-M1',
      cabinet: '柜M1',
      layer: '第1层',
      position: '位M1',
      quantity: 200,
    })
    const res = await request(app).post(`/api/inventory/${created.body.id}/move`).send({
      room: '测试库-M2',
      cabinet: '柜M2',
      layer: '第2层',
      position: '位M2',
    })
    expect(res.status).toBe(200)
    expect(res.body.room).toBe('测试库-M2')
    expect(res.body.cabinet).toBe('柜M2')
  })

  it('目标货位被占用时返回 409', async () => {
    const accessionId = await firstAccessionId()
    const a = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '中期库',
      room: '测试库-M3',
      cabinet: '柜M3',
      layer: '第1层',
      position: '位M3',
      quantity: 100,
    })
    const b = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '中期库',
      room: '测试库-M4',
      cabinet: '柜M4',
      layer: '第1层',
      position: '位M4',
      quantity: 100,
    })
    const res = await request(app).post(`/api/inventory/${b.body.id}/move`).send({
      room: '测试库-M3',
      cabinet: '柜M3',
      layer: '第1层',
      position: '位M3',
    })
    expect(res.status).toBe(409)
    expect(a.status).toBe(201)
  })
})

describe('POST /api/inventory/:id/stocktake 盘点', () => {
  it('返回账面、实盘与差异', async () => {
    const accessionId = await firstAccessionId()
    const created = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '短期库',
      room: '测试库-S1',
      cabinet: '柜S1',
      layer: '第1层',
      position: '位S1',
      quantity: 500,
      viabilityRate: 1,
    })
    const res = await request(app).post(`/api/inventory/${created.body.id}/stocktake`).send({ actualQuantity: 480, reason: '自然损耗' })
    expect(res.status).toBe(200)
    expect(res.body.bookQuantity).toBe(500)
    expect(res.body.actualQuantity).toBe(480)
    expect(res.body.diff).toBe(-20)
  })
})

describe('GET /api/inventory 库存列表', () => {
  it('支持按状态过滤', async () => {
    const res = await request(app).get('/api/inventory').query({ status: '耗尽' })
    expect(res.status).toBe(200)
    expect(res.body.every((l: { status: string }) => l.status === '耗尽')).toBe(true)
  })
})
