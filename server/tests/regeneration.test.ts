import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

async function firstAccessionId(): Promise<string> {
  const res = await request(app).get('/api/accessions')
  return res.body[0].id
}

describe('POST /api/regenerations 创建繁育计划', () => {
  it('成功创建处于计划阶段的繁育单', async () => {
    const accessionId = await firstAccessionId()
    const res = await request(app).post('/api/regenerations').send({
      accessionId,
      reason: '定期更新',
      plannedQuantity: 1000,
      plot: '试验田-9号',
      owner: '测试员',
    })
    expect(res.status).toBe(201)
    expect(res.body.stage).toBe('计划')
    expect(res.body.id).toMatch(/^RG-/)
  })

  it('关联种质不存在时返回 404', async () => {
    const res = await request(app).post('/api/regenerations').send({
      accessionId: 'GZ-NOPE',
      reason: '定期更新',
      plannedQuantity: 1000,
      plot: '试验田-9号',
    })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/regenerations/:id/advance 阶段流转', () => {
  it('按阶段顺序推进，入库时自动创建新批次', async () => {
    const accessionId = await firstAccessionId()
    const created = await request(app).post('/api/regenerations').send({
      accessionId,
      reason: '库存低于临界量',
      plannedQuantity: 800,
      plot: '试验田-10号',
      owner: '测试员',
    })
    const id = created.body.id

    const steps = ['播种', '田间管理', '收获', '入库']
    for (const expected of steps) {
      const res = await request(app).post(`/api/regenerations/${id}/advance`).send({})
      expect(res.status).toBe(200)
      expect(res.body.regeneration.stage).toBe(expected)
    }
    const last = await request(app).post(`/api/regenerations/${id}/advance`).send({})
    expect(last.body.regeneration.stage).toBe('已关闭')

    const lots = await request(app).get(`/api/accessions/${accessionId}/lots`)
    expect(lots.body.length).toBeGreaterThan(0)
  })

  it('入库阶段返回新建批次', async () => {
    const accessionId = await firstAccessionId()
    const created = await request(app).post('/api/regenerations').send({
      accessionId,
      reason: '定期更新',
      plannedQuantity: 600,
      plot: '试验田-11号',
    })
    const id = created.body.id
    let newLot: { id: string; quantity: number } | null = null
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post(`/api/regenerations/${id}/advance`).send({})
      if (res.body.newLot) newLot = res.body.newLot
    }
    expect(newLot).not.toBeNull()
    expect(newLot?.quantity).toBe(600)
  })

  it('已关闭的繁育单推进返回 409', async () => {
    const accessionId = await firstAccessionId()
    const created = await request(app).post('/api/regenerations').send({
      accessionId,
      reason: '定期更新',
      plannedQuantity: 500,
      plot: '试验田-12号',
    })
    const id = created.body.id
    for (let i = 0; i < 5; i++) await request(app).post(`/api/regenerations/${id}/advance`).send({})
    const res = await request(app).post(`/api/regenerations/${id}/advance`).send({})
    expect(res.status).toBe(409)
  })
})

describe('GET /api/regenerations/board 阶段看板', () => {
  it('按六个阶段分组返回', async () => {
    const res = await request(app).get('/api/regenerations/board')
    expect(res.status).toBe(200)
    expect(res.body.map((b: { stage: string }) => b.stage)).toEqual(['计划', '播种', '田间管理', '收获', '入库', '已关闭'])
  })
})
