import type { LotStatus } from '../types.js'

export class DomainError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

function round(n: number, digits = 2): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

/**
 * 活力率 = 各重复发芽数之和 / (重复数 × 每重复取样数)
 * 规则来源：PRD 需求 4 与 AOSA 发芽试验规程。
 */
export function calcViabilityRate(replicates: number, seedsPerReplicate: number, counts: number[]): number {
  if (!Number.isInteger(replicates) || replicates <= 0) {
    throw new DomainError('INVALID_REPLICATES', '重复数必须为正整数')
  }
  if (!Number.isInteger(seedsPerReplicate) || seedsPerReplicate <= 0) {
    throw new DomainError('INVALID_SEEDS', '每重复取样数必须为正整数')
  }
  if (counts.length === 0) {
    throw new DomainError('EMPTY_COUNTS', '至少需要一个重复的发芽数')
  }
  if (counts.length > replicates) {
    throw new DomainError('COUNTS_EXCEED_REPLICATES', '发芽数条目数不能超过重复数')
  }
  for (const c of counts) {
    if (!Number.isFinite(c) || c < 0) {
      throw new DomainError('INVALID_COUNT', '发芽数必须为非负数')
    }
    if (c > seedsPerReplicate) {
      throw new DomainError('COUNT_EXCEED_SAMPLE', '单重复发芽数不能超过每重复取样数')
    }
  }
  const sum = counts.reduce((a, b) => a + b, 0)
  const total = replicates * seedsPerReplicate
  return round(sum / total, 2)
}

/** 纯活种子 = 库存数量 × 最近活力率 */
export function calcPureLiveSeed(quantity: number, viabilityRate: number): number {
  if (quantity < 0) throw new DomainError('INVALID_QUANTITY', '数量不能为负')
  if (viabilityRate < 0 || viabilityRate > 1) throw new DomainError('INVALID_RATE', '活力率需在 0~1 之间')
  return Math.round(quantity * viabilityRate)
}

/** 根据数量与分发临界量判定库存状态 */
export function determineLotStatus(quantity: number, criticalAmount: number): LotStatus {
  if (quantity <= 0) return '耗尽'
  if (quantity < criticalAmount) return '偏低'
  return '正常'
}

/** 活力区间分类 */
export function classifyViability(rate: number): 'high' | 'mid' | 'low' {
  if (rate >= 0.9) return 'high'
  if (rate >= 0.75) return 'mid'
  return 'low'
}
