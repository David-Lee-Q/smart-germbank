import { Chip } from '@mui/material'

const COLOR_MAP: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  正常: 'success',
  启用: 'success',
  已批准: 'success',
  已分发: 'success',
  已闭环: 'success',
  入库: 'success',
  待鉴定: 'warning',
  偏低: 'warning',
  待审批: 'warning',
  处理中: 'info',
  田间管理: 'info',
  播种: 'info',
  计划: 'default',
  封存: 'default',
  已关闭: 'default',
  提示: 'info',
  警告: 'warning',
  严重: 'error',
  警报: 'error',
  耗尽: 'error',
  暂停分发: 'error',
  已注销: 'default',
  停用: 'default',
  已驳回: 'error',
  收获: 'primary',
  已提交: 'info',
  待处理: 'warning',
  已通过: 'success',
  已终止: 'default',
}

export default function StatusChip({ label, size = 'small' }: { label: string; size?: 'small' | 'medium' }) {
  return <Chip label={label} size={size} color={COLOR_MAP[label] ?? 'default'} variant={COLOR_MAP[label] ? 'filled' : 'outlined'} />
}
