import type { Express } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { createApp } from '../src/app'
import { createDb } from '../src/db'
import { seed } from '../src/seed'

export interface TestContext {
  app: Express
  db: DatabaseSync
}

/** 创建内存数据库并写入种子数据的测试应用实例 */
export function makeTestApp(seeded = true): TestContext {
  const db = createDb(':memory:')
  if (seeded) seed(db)
  const app = createApp(db)
  return { app, db }
}
