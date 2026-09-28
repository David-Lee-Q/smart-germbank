import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

describe('端到端业务闭环', () => {
  it('完成“登记→入库→活力检测→繁育更新→分发”全流程', async () => {
    // 1. 健康检查
    const health = await request(app).get('/api/health')
    expect(health.status).toBe(200)
    expect(health.body.status).toBe('ok')

    // 2. 登记新种质
    const created = await request(app).post('/api/accessions').send({
      name: '闭环测试种质',
      scientificName: 'Integratio testus',
      crop: '小麦',
      sourceType: '国内交换',
      storageType: '中期库',
      region: '河南省',
      collector: '闭环测试员',
    })
    expect(created.status).toBe(201)
    const accessionId: string = created.body.id

    // 3. 创建库存批次
    const lotRes = await request(app).post('/api/inventory').send({
      accessionId,
      storageType: '中期库',
      room: '闭环测试库',
      cabinet: '柜E2E',
      layer: '第1层',
      position: '位E2E',
      quantity: 1000,
      viabilityRate: 0.95,
      criticalAmount: 200,
    })
    expect(lotRes.status).toBe(201)
    const lotId: string = lotRes.body.id
    expect(lotRes.body.pureLiveSeed).toBe(950)

    // 4. 登记活力检测，回写批次
    const vt = await request(app).post('/api/viability').send({
      lotId,
      method: '发芽试验',
      replicates: 4,
      seedsPerReplicate: 50,
      counts: [48, 47, 49, 46],
      tester: '闭环测试员',
    })
    expect(vt.status).toBe(201)
    expect(vt.body.lot.viabilityRate).toBe(0.95)

    // 5. 创建繁育计划并推进到入库（自动生成新批次）
    const regen = await request(app).post('/api/regenerations').send({
      accessionId,
      reason: '定期更新',
      plannedQuantity: 800,
      plot: '闭环试验田',
      owner: '闭环测试员',
    })
    expect(regen.status).toBe(201)
    const regenId: string = regen.body.id
    let newLot: { id: string; quantity: number } | null = null
    for (let i = 0; i < 4; i++) {
      const adv = await request(app).post(`/api/regenerations/${regenId}/advance`).send({})
      expect(adv.status).toBe(200)
      if (adv.body.newLot) newLot = adv.body.newLot
    }
    expect(newLot).not.toBeNull()
    expect(newLot?.quantity).toBe(800)

    // 6. 分发：申请→批准→执行，扣减库存
    const apply = await request(app).post('/api/distributions').send({
      accessionId,
      lotId,
      applicant: '闭环申请人',
      organization: '闭环科研单位',
      quantity: 300,
      purpose: '区域试验',
    })
    expect(apply.status).toBe(201)
    const distId: string = apply.body.id
    const first = await request(app).post(`/api/distributions/${distId}/approve`).send({})
    expect(first.body.status).toBe('待审批')
    const second = await request(app).post(`/api/distributions/${distId}/approve`).send({})
    expect(second.body.status).toBe('已批准')
    const ship = await request(app).post(`/api/distributions/${distId}/ship`).send({})
    expect(ship.status).toBe(200)
    expect(ship.body.distribution.status).toBe('已分发')
    expect(ship.body.lot.quantity).toBe(700)

    // 7. 种质聚合视图反映了上述操作
    const lots = await request(app).get(`/api/accessions/${accessionId}/lots`)
    expect(lots.body.length).toBeGreaterThanOrEqual(2)
    const tests = await request(app).get(`/api/accessions/${accessionId}/viability`)
    expect(tests.body.length).toBe(1)
    const dists = await request(app).get(`/api/accessions/${accessionId}/distributions`)
    expect(dists.body.some((d: { id: string }) => d.id === distId)).toBe(true)

    // 8. 审计日志已记录关键动作
    const logs = await request(app).get('/api/system/audit-logs')
    const actions = logs.body.map((l: { action: string }) => l.action)
    for (const action of ['新增种质', '创建库存批次', '登记活力检测', '创建繁育计划', '执行分发']) {
      expect(actions).toContain(action)
    }
  })
})

describe('接口健壮性', () => {
  it('未知 API 路径返回 404 与统一错误结构', async () => {
    const res = await request(app).get('/api/not-existing')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('非法 JSON 参数返回 400 与统一错误结构', async () => {
    const res = await request(app).post('/api/inventory').send({ quantity: -5 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
