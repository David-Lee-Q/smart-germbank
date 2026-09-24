import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

describe('GET /api/accessions 种质列表', () => {
  it('返回全部种质', async () => {
    const res = await request(app).get('/api/accessions')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('id')
    expect(res.body[0]).toHaveProperty('scientificName')
  })

  it('按作物过滤', async () => {
    const res = await request(app).get('/api/accessions').query({ crop: '水稻' })
    expect(res.status).toBe(200)
    expect(res.body.every((a: { crop: string }) => a.crop === '水稻')).toBe(true)
  })

  it('按关键词模糊匹配编号/名称/学名', async () => {
    const all = await request(app).get('/api/accessions')
    const target = all.body[0]
    const res = await request(app).get('/api/accessions').query({ keyword: target.id })
    expect(res.status).toBe(200)
    expect(res.body.some((a: { id: string }) => a.id === target.id)).toBe(true)
  })

  it('按来源类型与保存类型组合过滤', async () => {
    const res = await request(app).get('/api/accessions').query({ sourceType: '国外引进', storageType: '长期库' })
    expect(res.status).toBe(200)
    expect(
      res.body.every((a: { sourceType: string; storageType: string }) => a.sourceType === '国外引进' && a.storageType === '长期库'),
    ).toBe(true)
  })
})

describe('GET /api/accessions/:id 种质详情', () => {
  it('返回指定种质', async () => {
    const all = await request(app).get('/api/accessions')
    const id = all.body[1].id
    const res = await request(app).get(`/api/accessions/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(id)
  })

  it('不存在时返回 404', async () => {
    const res = await request(app).get('/api/accessions/GZ-NOT-EXIST')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('返回关联批次/检测/繁育/分发与时间线', async () => {
    const all = await request(app).get('/api/accessions')
    const id = all.body[0].id
    const [lots, tests, regens, dists, timeline] = await Promise.all([
      request(app).get(`/api/accessions/${id}/lots`),
      request(app).get(`/api/accessions/${id}/viability`),
      request(app).get(`/api/accessions/${id}/regenerations`),
      request(app).get(`/api/accessions/${id}/distributions`),
      request(app).get(`/api/accessions/${id}/timeline`),
    ])
    for (const r of [lots, tests, regens, dists, timeline]) expect(r.status).toBe(200)
    expect(Array.isArray(lots.body)).toBe(true)
    expect(timeline.body.length).toBeGreaterThanOrEqual(2)
  })
})

describe('POST /api/accessions 登记种质', () => {
  it('成功登记并生成编号', async () => {
    const res = await request(app).post('/api/accessions').send({
      name: '测试水稻-001',
      scientificName: 'Oryza sativa L.',
      crop: '水稻',
      sourceType: '野外采集',
      storageType: '中期库',
      region: '云南省',
      collector: '测试员',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toMatch(/^GZ-/)
    expect(res.body.status).toBe('待鉴定')
  })

  it('缺少名称或学名时返回 400', async () => {
    const res = await request(app).post('/api/accessions').send({ crop: '水稻' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PUT /api/accessions/:id 修改种质', () => {
  it('可更新描述字段', async () => {
    const created = await request(app).post('/api/accessions').send({
      name: '待修改种质',
      scientificName: 'Testus plantus',
      crop: '大豆',
      sourceType: '育种选育',
      storageType: '短期库',
    })
    const res = await request(app).put(`/api/accessions/${created.body.id}`).send({ description: '已更新描述' })
    expect(res.status).toBe(200)
    expect(res.body.description).toBe('已更新描述')
  })
})

describe('GET /api/accessions/export 导出', () => {
  it('返回 CSV 内容', async () => {
    const res = await request(app).get('/api/accessions/export')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).toContain('种质编号,名称,学名')
  })
})
