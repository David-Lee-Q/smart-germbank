import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

async function accessionIds(): Promise<string[]> {
  const res = await request(app).get('/api/accessions')
  return res.body.map((a: { id: string }) => a.id)
}

async function makeLot(accessionId: string, suffix: string, quantity = 1000, viabilityRate = 1) {
  const res = await request(app).post('/api/inventory').send({
    accessionId,
    storageType: '中期库',
    room: `分发测试库-${suffix}`,
    cabinet: `柜${suffix}`,
    layer: '第1层',
    position: `位${suffix}`,
    quantity,
    viabilityRate,
    criticalAmount: 100,
  })
  return res.body
}

describe('POST /api/distributions 申请分发', () => {
  it('申请成功后状态为待审批', async () => {
    const [accId] = await accessionIds()
    const lot = await makeLot(accId, 'A1')
    const res = await request(app).post('/api/distributions').send({
      accessionId: accId,
      lotId: lot.id,
      applicant: '张三',
      organization: '某农业大学',
      quantity: 200,
      purpose: '科研试验',
    })
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('待审批')
    expect(res.body.id).toMatch(/^DR-/)
  })

  it('申请数量超过批次可用量返回 409', async () => {
    const [accId] = await accessionIds()
    const lot = await makeLot(accId, 'A2', 100)
    const res = await request(app).post('/api/distributions').send({
      accessionId: accId,
      lotId: lot.id,
      applicant: '张三',
      organization: '某农业大学',
      quantity: 101,
      purpose: '科研试验',
    })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
  })

  it('种质与批次不匹配返回 400', async () => {
    const [accA, accB] = await accessionIds()
    const lot = await makeLot(accA, 'A3')
    const res = await request(app).post('/api/distributions').send({
      accessionId: accB,
      lotId: lot.id,
      applicant: '张三',
      organization: '某农业大学',
      quantity: 10,
      purpose: '科研试验',
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('ACCESSION_MISMATCH')
  })

  it('批次不存在返回 404', async () => {
    const [accId] = await accessionIds()
    const res = await request(app).post('/api/distributions').send({
      accessionId: accId,
      lotId: 'LOT-NOPE',
      applicant: '张三',
      organization: '某农业大学',
      quantity: 10,
      purpose: '科研试验',
    })
    expect(res.status).toBe(404)
  })
})

describe('分发审批流转', () => {
  async function createPending(suffix: string, quantity = 500, lotQuantity = 1000) {
    const [accId] = await accessionIds()
    const lot = await makeLot(accId, suffix, lotQuantity)
    const res = await request(app).post('/api/distributions').send({
      accessionId: accId,
      lotId: lot.id,
      applicant: '李四',
      organization: '某研究所',
      quantity,
      purpose: '育种材料',
    })
    return { distribution: res.body, lot }
  }

  it('批准后状态变为已批准', async () => {
    const { distribution } = await createPending('B1')
    const res = await request(app).post(`/api/distributions/${distribution.id}/approve`).send({ comment: '同意' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('已批准')
    expect(res.body.reviewComment).toBe('同意')
  })

  it('驳回后状态变为已驳回且记录原因', async () => {
    const { distribution } = await createPending('B2')
    const res = await request(app).post(`/api/distributions/${distribution.id}/reject`).send({ reason: '材料不齐' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('已驳回')
    expect(res.body.reviewComment).toBe('材料不齐')
  })

  it('驳回缺少原因返回 400', async () => {
    const { distribution } = await createPending('B3')
    const res = await request(app).post(`/api/distributions/${distribution.id}/reject`).send({})
    expect(res.status).toBe(400)
  })

  it('已批准后不能再次批准', async () => {
    const { distribution } = await createPending('B4')
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    const res = await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_STATE')
  })

  it('未批准不能执行分发', async () => {
    const { distribution } = await createPending('B5')
    const res = await request(app).post(`/api/distributions/${distribution.id}/ship`).send({})
    expect(res.status).toBe(409)
  })

  it('批准并执行分发后扣减库存', async () => {
    const { distribution, lot } = await createPending('B6', 300, 1000)
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    const res = await request(app).post(`/api/distributions/${distribution.id}/ship`).send({})
    expect(res.status).toBe(200)
    expect(res.body.distribution.status).toBe('已分发')
    expect(res.body.lot.quantity).toBe(700)
  })

  it('分发后库存低于临界量产生预警', async () => {
    const { distribution, lot } = await createPending('B7', 450, 500)
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    await request(app).post(`/api/distributions/${distribution.id}/ship`).send({})
    const alerts = await request(app).get('/api/alerts').query({ type: '库存不足' })
    expect(alerts.body.some((a: { targetId: string }) => a.targetId === lot.id)).toBe(true)
  })
})

describe('GET /api/distributions', () => {
  it('支持按状态过滤', async () => {
    const res = await request(app).get('/api/distributions').query({ status: '已批准' })
    expect(res.status).toBe(200)
    expect(res.body.every((d: { status: string }) => d.status === '已批准')).toBe(true)
  })
})
