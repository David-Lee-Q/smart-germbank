import { Router } from 'express'
import type { DB } from '../db.js'
import { toEnvReading, toRoom } from '../lib/mappers.js'
import { DomainError } from '../lib/calc.js'

export function environmentRoutes(db: DB): Router {
  const router = Router()

  router.get('/rooms', (_req, res) => {
    const rooms = db.prepare('SELECT * FROM storage_rooms ORDER BY id').all()
    res.json(
      rooms.map((r) => {
        const room = toRoom(r as Record<string, unknown>)
        const occupied = (
          db.prepare(`SELECT COUNT(*) AS c FROM lots WHERE room = ? AND status != '耗尽'`).get(room.name) as { c: number }
        ).c
        return { ...room, occupied, capacity: 36 }
      }),
    )
  })

  router.get('/rooms/:id/readings', (req, res) => {
    const room = db.prepare('SELECT * FROM storage_rooms WHERE id = ?').get(req.params.id)
    if (!room) throw new DomainError('NOT_FOUND', '库房不存在', 404)
    const rows = db.prepare('SELECT * FROM env_readings WHERE room_id = ? ORDER BY id').all(req.params.id)
    res.json(rows.map((r) => toEnvReading(r as Record<string, unknown>)))
  })

  router.get('/rooms/:id/latest', (req, res) => {
    const roomRow = db.prepare('SELECT * FROM storage_rooms WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
    if (!roomRow) throw new DomainError('NOT_FOUND', '库房不存在', 404)
    const room = toRoom(roomRow)
    const reading = db.prepare('SELECT * FROM env_readings WHERE room_id = ? ORDER BY id DESC LIMIT 1').get(req.params.id) as
      | Record<string, unknown>
      | undefined
    if (!reading) throw new DomainError('NOT_FOUND', '暂无采集数据', 404)
    const latest = toEnvReading(reading)
    const tempOut = latest.temperature < room.tempMin || latest.temperature > room.tempMax
    const humidityOut = latest.humidity > room.humidityMax
    res.json({ room, reading: latest, abnormal: tempOut || humidityOut, tempOut, humidityOut })
  })

  return router
}
