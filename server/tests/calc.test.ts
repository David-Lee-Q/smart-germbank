import { describe, expect, it } from 'vitest'
import { calcPureLiveSeed, calcViabilityRate, classifyViability, determineLotStatus, DomainError } from '../src/lib/calc'

describe('calcViabilityRate 活力率计算', () => {
  it('按“各重复发芽数之和 / (重复数 × 取样数)”计算', () => {
    expect(calcViabilityRate(4, 50, [45, 48, 44, 46])).toBe(0.92)
    expect(calcViabilityRate(2, 100, [80, 90])).toBe(0.85)
  })

  it('全部发芽时活力率为 1', () => {
    expect(calcViabilityRate(3, 50, [50, 50, 50])).toBe(1)
  })

  it('全部不发芽时活力率为 0', () => {
    expect(calcViabilityRate(3, 50, [0, 0, 0])).toBe(0)
  })

  it('重复数必须为正整数', () => {
    expect(() => calcViabilityRate(0, 50, [10])).toThrow(DomainError)
    expect(() => calcViabilityRate(-1, 50, [10])).toThrow(DomainError)
  })

  it('每重复取样数必须为正整数', () => {
    expect(() => calcViabilityRate(2, 0, [10])).toThrow(DomainError)
  })

  it('发芽数条目不能为空', () => {
    expect(() => calcViabilityRate(2, 50, [])).toThrow(DomainError)
  })

  it('发芽数条目数不能超过重复数', () => {
    expect(() => calcViabilityRate(2, 50, [1, 2, 3])).toThrow(/不能超过重复数/)
  })

  it('单重复发芽数不能超过取样数', () => {
    expect(() => calcViabilityRate(2, 50, [51, 10])).toThrow(/不能超过每重复取样数/)
  })

  it('发芽数不能为负数', () => {
    expect(() => calcViabilityRate(2, 50, [-1, 10])).toThrow(DomainError)
  })

  it('允许少于重复数的输入（如部分重复未记录）', () => {
    expect(calcViabilityRate(4, 50, [40])).toBe(0.2)
  })
})

describe('calcPureLiveSeed 纯活种子计算', () => {
  it('等于库存数量乘以最近活力率', () => {
    expect(calcPureLiveSeed(1000, 0.5)).toBe(500)
    expect(calcPureLiveSeed(333, 0.9)).toBe(300)
  })

  it('数量为负时报错', () => {
    expect(() => calcPureLiveSeed(-1, 0.5)).toThrow(DomainError)
  })

  it('活力率越界时报错', () => {
    expect(() => calcPureLiveSeed(100, 1.5)).toThrow(DomainError)
  })
})

describe('determineLotStatus 库存状态判定', () => {
  it('数量为 0 判定为耗尽', () => {
    expect(determineLotStatus(0, 100)).toBe('耗尽')
  })
  it('低于临界量判定为偏低', () => {
    expect(determineLotStatus(99, 100)).toBe('偏低')
  })
  it('达到临界量判定为正常', () => {
    expect(determineLotStatus(100, 100)).toBe('正常')
    expect(determineLotStatus(500, 100)).toBe('正常')
  })
})

describe('classifyViability 活力区间分类', () => {
  it('≥90% 为 high', () => {
    expect(classifyViability(0.9)).toBe('high')
    expect(classifyViability(1)).toBe('high')
  })
  it('75%~90% 为 mid', () => {
    expect(classifyViability(0.75)).toBe('mid')
    expect(classifyViability(0.89)).toBe('mid')
  })
  it('<75% 为 low', () => {
    expect(classifyViability(0.74)).toBe('low')
  })
})
