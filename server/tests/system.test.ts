import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

describe('GET /api/system/users 用户', () => {
  it('返回用户列表且不包含口令字段', async () => {
    const res = await request(app).get('/api/system/users')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('account')
    expect(res.body[0]).toHaveProperty('roles')
    expect(res.body[0]).not.toHaveProperty('password')
  })
})

describe('GET /api/system/roles 角色', () => {
  it('返回角色及其权限', async () => {
    const res = await request(app).get('/api/system/roles')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(Array.isArray(res.body[0].permissions)).toBe(true)
  })
})

describe('GET /api/system/dictionaries 数据字典', () => {
  it('返回库类型/来源类型等字典', async () => {
    const res = await request(app).get('/api/system/dictionaries')
    expect(res.status).toBe(200)
    expect(res.body['库类型']).toContain('长期库')
    expect(res.body['来源类型']).toContain('野外采集')
    expect(Array.isArray(res.body['预警类型'])).toBe(true)
  })
})

describe('GET /api/system/audit-logs 审计日志', () => {
  it('返回日志并按操作人过滤', async () => {
    const all = await request(app).get('/api/system/audit-logs')
    expect(all.status).toBe(200)
    expect(all.body.length).toBeGreaterThan(0)
    const operator = all.body[0].operator
    const filtered = await request(app).get('/api/system/audit-logs').query({ operator })
    expect(filtered.body.every((l: { operator: string }) => l.operator === operator)).toBe(true)
  })

  it('按对象类型过滤', async () => {
    await request(app).post('/api/accessions').send({
      name: '审计测试种质',
      scientificName: 'Auditus testus',
      crop: '玉米',
      sourceType: '野外采集',
      storageType: '短期库',
    })
    const res = await request(app).get('/api/system/audit-logs').query({ objectType: 'Accession' })
    expect(res.status).toBe(200)
    expect(res.body.some((l: { action: string }) => l.action === '新增种质')).toBe(true)
  })
})
