import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './helpers'

const { app } = makeTestApp()

describe('GET /api/rooms 库房列表', () => {
  it('返回库房及占用数', async () => {
    const res = await request(app).get('/api/rooms')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('occupied')
    expect(res.body[0]).toHaveProperty('capacity')
    expect(res.body[0].capacity).toBe(36)
  })
})

describe('GET /api/rooms/:id/readings 环境采集记录', () => {
  it('返回该库房的历史读数', async () => {
    const rooms = await request(app).get('/api/rooms')
    const id = rooms.body[0].id
    const res = await request(app).get(`/api/rooms/${id}/readings`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('temperature')
    expect(res.body[0]).toHaveProperty('humidity')
  })

  it('库房不存在返回 404', async () => {
    const res = await request(app).get('/api/rooms/NOPE/readings')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/rooms/:id/latest 最新环境', () => {
  it('返回最新读数与异常判定', async () => {
    const rooms = await request(app).get('/api/rooms')
    const id = rooms.body[0].id
    const res = await request(app).get(`/api/rooms/${id}/latest`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('room')
    expect(res.body).toHaveProperty('reading')
    expect(res.body).toHaveProperty('abnormal')
    expect(res.body).toHaveProperty('tempOut')
    expect(res.body).toHaveProperty('humidityOut')
    expect(typeof res.body.abnormal).toBe('boolean')
  })

  it('库房不存在返回 404', async () => {
    const res = await request(app).get('/api/rooms/NOPE/latest')
    expect(res.status).toBe(404)
  })
})
