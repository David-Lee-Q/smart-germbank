import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

describe('GET /api/alerts 预警列表', () => {
  it('返回预警数组', async () => {
    const res = await request(app).get('/api/alerts')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('level')
    expect(res.body[0]).toHaveProperty('status')
  })

  it('支持按级别过滤', async () => {
    const res = await request(app).get('/api/alerts').query({ level: '严重' })
    expect(res.status).toBe(200)
    expect(res.body.every((a: { level: string }) => a.level === '严重')).toBe(true)
  })

  it('支持按状态过滤', async () => {
    const res = await request(app).get('/api/alerts').query({ status: '未处理' })
    expect(res.status).toBe(200)
    expect(res.body.every((a: { status: string }) => a.status === '未处理')).toBe(true)
  })
})

describe('GET /api/alerts/summary 预警汇总', () => {
  it('返回总数/待处理/严重/已闭环', async () => {
    const res = await request(app).get('/api/alerts/summary')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('pending')
    expect(res.body).toHaveProperty('severe')
    expect(res.body).toHaveProperty('closed')
    expect(res.body.total).toBeGreaterThanOrEqual(res.body.pending)
  })
})

describe('POST /api/alerts/:id/handle 处理预警', () => {
  it('可流转到处理中与已闭环', async () => {
    const list = await request(app).get('/api/alerts')
    const id = list.body[0].id
    const first = await request(app).post(`/api/alerts/${id}/handle`).send({ status: '处理中' })
    expect(first.status).toBe(200)
    expect(first.body.status).toBe('处理中')
    const second = await request(app).post(`/api/alerts/${id}/handle`).send({ status: '已闭环', note: '已处理' })
    expect(second.body.status).toBe('已闭环')
  })

  it('状态非法返回 400', async () => {
    const list = await request(app).get('/api/alerts')
    const res = await request(app).post(`/api/alerts/${list.body[0].id}/handle`).send({ status: '不存在状态' })
    expect(res.status).toBe(400)
  })

  it('预警不存在返回 404', async () => {
    const res = await request(app).post('/api/alerts/AL-NOPE/handle').send({ status: '已闭环' })
    expect(res.status).toBe(404)
  })
})
