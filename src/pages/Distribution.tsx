import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { Check as ApproveIcon, Close as RejectIcon, LocalShipping as ShipIcon, History as RecordIcon, Refresh as ResubmitIcon } from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { api } from '../data/api'
import type { ApprovalNode, ApprovalNodeStatus, DistributionRequest } from '../data/types'

const ROLE_DEFAULT: Record<string, string> = { 库管员: '张伟', 库负责人: '王强' }

const DOT_COLOR: Record<ApprovalNodeStatus, string> = {
  已提交: 'info.main',
  待处理: 'warning.main',
  已通过: 'success.main',
  已驳回: 'error.main',
  已终止: 'text.disabled',
}

function currentRoundOf(r: DistributionRequest): number {
  const a = r.approvals ?? []
  return a.length ? Math.max(...a.map((x) => x.round)) : 1
}

function currentNodeOf(r: DistributionRequest): ApprovalNode | null {
  const round = currentRoundOf(r)
  return (r.approvals ?? []).find((a) => a.round === round && a.seq >= 1 && a.seq <= 3 && a.status === '待处理') ?? null
}

function progressOf(r: DistributionRequest) {
  const round = currentRoundOf(r)
  const nodes = (r.approvals ?? []).filter((a) => a.round === round && a.seq >= 1 && a.seq <= 3).sort((a, b) => a.seq - b.seq)
  const passed = nodes.filter((n) => n.status === '已通过').length
  return { nodes, passed }
}

function groupByRound(nodes: ApprovalNode[]) {
  const map = new Map<number, ApprovalNode[]>()
  for (const n of nodes) {
    const list = map.get(n.round) ?? []
    list.push(n)
    map.set(n.round, list)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0])
}

type ActionKind = 'approve' | 'reject' | 'ship' | 'resubmit'

const ACTION_META: Record<ActionKind, { title: string; fieldLabel: string; submit: string }> = {
  approve: { title: '批准节点', fieldLabel: '审批备注（可选）', submit: '确认批准' },
  reject: { title: '驳回节点', fieldLabel: '驳回原因（必填）', submit: '确认驳回' },
  ship: { title: '执行分发', fieldLabel: '发货备注（可选）', submit: '确认执行' },
  resubmit: { title: '重新提交申请', fieldLabel: '重新提交说明（可选）', submit: '确认提交' },
}

export default function Distribution() {
  const [rows, setRows] = useState<DistributionRequest[]>([])
  const [tab, setTab] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [action, setAction] = useState<{ kind: ActionKind; target: DistributionRequest } | null>(null)
  const [approver, setApprover] = useState('')
  const [comment, setComment] = useState('')
  const [recordTarget, setRecordTarget] = useState<DistributionRequest | null>(null)

  useEffect(() => {
    api.listDistributions().then(setRows).catch((e: Error) => setError(e.message))
  }, [])

  const filtered = rows.filter((r) => {
    if (tab === 1 && r.status !== '待审批') return false
    if (tab === 2 && r.status !== '已批准') return false
    if (tab === 3 && r.status !== '已分发') return false
    if (tab === 4 && r.status !== '已驳回') return false
    if (keyword && !r.id.includes(keyword) && !r.accessionId.includes(keyword) && !r.applicant.includes(keyword) && !r.organization.includes(keyword)) return false
    return true
  })

  const openAction = (kind: ActionKind, r: DistributionRequest) => {
    const node = currentNodeOf(r)
    const defaultApprover =
      kind === 'ship' ? ROLE_DEFAULT['库管员'] : kind === 'resubmit' ? r.applicant : node ? ROLE_DEFAULT[node.role] ?? r.applicant : r.applicant
    setApprover(defaultApprover)
    setComment('')
    setAction({ kind, target: r })
  }

  const doAction = async () => {
    if (!action) return
    const { kind, target } = action
    const node = currentNodeOf(target)
    if (kind === 'reject' && !comment.trim()) {
      setToast('请填写驳回原因')
      return
    }
    try {
      let updated: DistributionRequest
      if (kind === 'approve') {
        updated = await api.approveDistribution(target.id, { approver, comment: comment.trim() || undefined })
      } else if (kind === 'reject') {
        updated = await api.rejectDistribution(target.id, { approver, reason: comment.trim() })
      } else if (kind === 'ship') {
        const res = await api.shipDistribution(target.id, { approver, comment: comment.trim() || undefined })
        updated = res.distribution
      } else {
        updated = await api.resubmitDistribution(target.id, comment.trim() || undefined)
      }
      setRows((prev) => prev.map((x) => (x.id === target.id ? updated : x)))
      if (kind === 'approve') setToast(node?.seq === 2 ? `${target.id} 已批准，等待执行分发` : `${target.id} 「${node?.nodeName ?? '审批节点'}」已通过`)
      else if (kind === 'reject') setToast(`${target.id} 已驳回并通知申请人`)
      else if (kind === 'ship') setToast(`${target.id} 分发执行完成，库存已扣减`)
      else setToast(`${target.id} 已重新提交，进入新一轮审批`)
      setAction(null)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '操作失败')
    }
  }

  return (
    <Box>
      <PageHeader title="分发共享" subtitle="在线申请、全节点审批与分发执行，全流程可追溯" />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2, p: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="搜索申请单号 / 种质编号 / 申请人 / 单位"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </Card>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label={`全部 (${rows.length})`} />
          <Tab label={`待审批 (${rows.filter((r) => r.status === '待审批').length})`} />
          <Tab label={`已批准 (${rows.filter((r) => r.status === '已批准').length})`} />
          <Tab label={`已分发 (${rows.filter((r) => r.status === '已分发').length})`} />
          <Tab label={`已驳回 (${rows.filter((r) => r.status === '已驳回').length})`} />
        </Tabs>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>申请单号</TableCell>
                <TableCell>种质编号</TableCell>
                <TableCell>批次号</TableCell>
                <TableCell>申请人</TableCell>
                <TableCell>单位</TableCell>
                <TableCell align="right">数量</TableCell>
                <TableCell>用途</TableCell>
                <TableCell>申请日期</TableCell>
                <TableCell>审批进度</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, 30).map((r) => {
                const progress = progressOf(r)
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.id}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.accessionId}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.lotId}</TableCell>
                    <TableCell>{r.applicant}</TableCell>
                    <TableCell>{r.organization}</TableCell>
                    <TableCell align="right">{r.quantity}</TableCell>
                    <TableCell>{r.purpose}</TableCell>
                    <TableCell>{r.appliedAt}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Stack direction="row" spacing={0.5}>
                          {progress.nodes.map((n) => (
                            <Box key={n.id} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DOT_COLOR[n.status] }} />
                          ))}
                        </Stack>
                        <Typography variant="caption">{progress.passed}/3</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <StatusChip label={r.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" startIcon={<RecordIcon />} onClick={() => setRecordTarget(r)}>
                          审批记录
                        </Button>
                        {r.status === '待审批' && (
                          <>
                            <Button size="small" startIcon={<ApproveIcon />} color="success" onClick={() => openAction('approve', r)}>
                              批准
                            </Button>
                            <Button size="small" startIcon={<RejectIcon />} color="error" onClick={() => openAction('reject', r)}>
                              驳回
                            </Button>
                          </>
                        )}
                        {r.status === '已批准' && (
                          <Button size="small" startIcon={<ShipIcon />} variant="contained" onClick={() => openAction('ship', r)}>
                            执行分发
                          </Button>
                        )}
                        {r.status === '已驳回' && (
                          <Button size="small" startIcon={<ResubmitIcon />} onClick={() => openAction('resubmit', r)}>
                            重新提交
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!action} onClose={() => setAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {action ? ACTION_META[action.kind].title : ''}
          {action && action.kind !== 'resubmit' && ` · ${currentNodeOf(action.target)?.nodeName ?? ''}`}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {action?.target.id} · {action?.target.organization}
          </Typography>
          {action?.kind !== 'resubmit' && (
            <TextField
              fullWidth
              size="small"
              label="审批人"
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            label={action ? ACTION_META[action.kind].fieldLabel : ''}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAction(null)}>取消</Button>
          <Button color={action?.kind === 'reject' ? 'error' : 'primary'} variant="contained" onClick={doAction}>
            {action ? ACTION_META[action.kind].submit : ''}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!recordTarget} onClose={() => setRecordTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>审批记录 · {recordTarget?.id}</DialogTitle>
        <DialogContent dividers>
          {recordTarget &&
            groupByRound(recordTarget.approvals ?? []).map(([round, nodes]) => (
              <Box key={round} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  第 {round} 轮{round > 1 ? '（重新提交）' : ''}
                </Typography>
                <Stack spacing={1.5}>
                  {nodes.map((n) => (
                    <Stack key={n.id} direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DOT_COLOR[n.status], mt: '7px', flexShrink: 0 }} />
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" fontWeight={600}>
                            {n.nodeName}
                          </Typography>
                          <Chip size="small" variant="outlined" label={n.role} />
                          <StatusChip label={n.status} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {n.approver}
                          {n.actedAt ? ` · ${n.actedAt}` : ''}
                        </Typography>
                        {n.comment && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            备注：{n.comment}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}
          {!recordTarget || (recordTarget.approvals ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              暂无审批记录
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordTarget(null)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3200} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
