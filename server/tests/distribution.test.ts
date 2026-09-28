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

describe('POST /api/distributions 申请分发', () => {
  it('申请成功后状态为待审批并生成第 1 轮审批链', async () => {
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
    expect(res.body.approvals).toHaveLength(4)
    expect(res.body.approvals[0].seq).toBe(0)
    expect(res.body.approvals[0].nodeName).toBe('申请提交')
    expect(res.body.approvals[0].approver).toBe('张三')
    expect(res.body.approvals[0].status).toBe('已提交')
    expect(res.body.approvals.filter((a: { seq: number }) => a.seq >= 1)).toHaveLength(3)
    expect(res.body.approvals.every((a: { status: string; seq: number }) => a.seq === 0 || a.status === '待处理')).toBe(true)
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

describe('分发审批流转（三节点）', () => {
  it('节点 1 批准后状态仍为待审批，节点 2 待处理', async () => {
    const { distribution } = await createPending('B1')
    const res = await request(app).post(`/api/distributions/${distribution.id}/approve`).send({ comment: '同意初审' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('待审批')
    const n1 = res.body.approvals.find((a: { seq: number }) => a.seq === 1)
    const n2 = res.body.approvals.find((a: { seq: number }) => a.seq === 2)
    expect(n1.status).toBe('已通过')
    expect(n1.approver).toBe('张伟')
    expect(n1.comment).toBe('同意初审')
    expect(n2.status).toBe('待处理')
  })

  it('节点 2 批准后状态变为已批准', async () => {
    const { distribution } = await createPending('B2')
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    const res = await request(app).post(`/api/distributions/${distribution.id}/approve`).send({ approver: '王强' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('已批准')
    const n2 = res.body.approvals.find((a: { seq: number }) => a.seq === 2)
    expect(n2.status).toBe('已通过')
    expect(n2.approver).toBe('王强')
  })

  it('未全部通过时执行分发返回 409', async () => {
    const { distribution } = await createPending('B3')
    const res = await request(app).post(`/api/distributions/${distribution.id}/ship`).send({})
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_STATE')
  })

  it('三节点全部通过后状态已分发且扣减库存', async () => {
    const { distribution, lot } = await createPending('B4', 300, 1000)
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    const res = await request(app).post(`/api/distributions/${distribution.id}/ship`).send({})
    expect(res.status).toBe(200)
    expect(res.body.distribution.status).toBe('已分发')
    expect(res.body.lot.quantity).toBe(700)
    expect(res.body.distribution.approvals.filter((a: { seq: number; status: string }) => a.seq >= 1 && a.status === '已通过')).toHaveLength(3)
  })

  it('驳回后节点已驳回、后续节点已终止并记录原因', async () => {
    const { distribution } = await createPending('B5')
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    const res = await request(app).post(`/api/distributions/${distribution.id}/reject`).send({ reason: '材料不齐' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('已驳回')
    expect(res.body.reviewComment).toBe('材料不齐')
    const n2 = res.body.approvals.find((a: { seq: number }) => a.seq === 2)
    const n3 = res.body.approvals.find((a: { seq: number }) => a.seq === 3)
    expect(n2.status).toBe('已驳回')
    expect(n3.status).toBe('已终止')
  })

  it('驳回缺少原因返回 400', async () => {
    const { distribution } = await createPending('B6')
    const res = await request(app).post(`/api/distributions/${distribution.id}/reject`).send({})
    expect(res.status).toBe(400)
  })

  it('驳回后重新提交开启新一轮并保留历史记录', async () => {
    const { distribution } = await createPending('B7')
    await request(app).post(`/api/distributions/${distribution.id}/reject`).send({ reason: '驳回' })
    const res = await request(app).post(`/api/distributions/${distribution.id}/resubmit`).send({ comment: '已补充说明' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('待审批')
    const rounds = new Set(res.body.approvals.map((a: { round: number }) => a.round))
    expect(rounds.has(1)).toBe(true)
    expect(rounds.has(2)).toBe(true)
    const round2Nodes = res.body.approvals.filter((a: { round: number; seq: number }) => a.round === 2 && a.seq >= 1)
    expect(round2Nodes).toHaveLength(3)
    expect(round2Nodes.every((a: { status: string }) => a.status === '待处理')).toBe(true)
    const event = res.body.approvals.find((a: { round: number; seq: number }) => a.round === 2 && a.seq === 0)
    expect(event.nodeName).toBe('重新提交')
    expect(event.status).toBe('已提交')
    expect(event.comment).toBe('已补充说明')
  })

  it('非已驳回状态重新提交返回 409', async () => {
    const { distribution } = await createPending('B8')
    const res = await request(app).post(`/api/distributions/${distribution.id}/resubmit`).send({})
    expect(res.status).toBe(409)
  })

  it('全部节点处理完毕后再操作返回 409', async () => {
    const { distribution } = await createPending('B9', 100, 1000)
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    await request(app).post(`/api/distributions/${distribution.id}/ship`).send({})
    const res = await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_STATE')
  })

  it('分发后库存低于临界量产生预警', async () => {
    const { distribution, lot } = await createPending('B10', 450, 500)
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    await request(app).post(`/api/distributions/${distribution.id}/approve`).send({})
    await request(app).post(`/api/distributions/${distribution.id}/ship`).send({})
    const alerts = await request(app).get('/api/alerts').query({ type: '库存不足' })
    expect(alerts.body.some((a: { targetId: string }) => a.targetId === lot.id)).toBe(true)
  })
})

describe('GET /api/distributions', () => {
  it('支持按状态过滤且内嵌审批记录', async () => {
    const res = await request(app).get('/api/distributions').query({ status: '已批准' })
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body.every((d: { status: string }) => d.status === '已批准')).toBe(true)
    expect(res.body.every((d: { approvals?: unknown[] }) => Array.isArray(d.approvals) && d.approvals.length > 0)).toBe(true)
  })
})
