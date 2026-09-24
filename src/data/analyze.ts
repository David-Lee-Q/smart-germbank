export type ViabilityClass = 'high' | 'mid' | 'low'

/** 活力区间分类：≥90% 高、75%~90% 中、<75% 低 */
export function classifyViability(rate: number): ViabilityClass {
  if (rate >= 0.9) return 'high'
  if (rate >= 0.75) return 'mid'
  return 'low'
}
