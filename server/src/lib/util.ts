import type { DB } from '../db.js'

export function now(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function today(): string {
  return now().slice(0, 10)
}

let counter = 0

export function nextId(prefix: string): string {
  counter = (counter + 1) % 1000
  const seq = String(Math.floor(Math.random() * 90000) + 10000)
  return `${prefix}-${Date.now().toString().slice(-6)}${String(counter).padStart(3, '0')}${seq.slice(0, 2)}`
}

export function writeAudit(
  db: DB,
  operator: string,
  action: string,
  objectType: string,
  objectId: string,
  ip = '127.0.0.1',
): void {
  db.prepare(
    `INSERT INTO audit_logs (id,operator,action,object_type,object_id,created_at,ip) VALUES (?,?,?,?,?,?,?)`,
  ).run(nextId('LOG'), operator, action, objectType, objectId, now(), ip)
}

export function createAlert(
  db: DB,
  params: { type: string; level: string; target: string; targetId: string; description: string },
): void {
  db.prepare(
    `INSERT INTO alerts (id,type,level,target,target_id,description,status,created_at) VALUES (?,?,?,?,?,?,?,?)`,
  ).run(nextId('AL'), params.type, params.level, params.target, params.targetId, params.description, '未处理', now())
}
