import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import { Check as ApproveIcon, Close as RejectIcon, LocalShipping as ShipIcon } from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { api } from '../data/api'
import type { DistributionRequest } from '../data/types'

export default function Distribution() {
  const [rows, setRows] = useState<DistributionRequest[]>([])
  const [tab, setTab] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [rejectTarget, setRejectTarget] = useState<DistributionRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')

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

  const approve = async (r: DistributionRequest) => {
    try {
      const updated = await api.approveDistribution(r.id, '同意分发')
      setRows((prev) => prev.map((x) => (x.id === r.id ? updated : x)))
      setToast(`${r.id} 审批通过，已通知库管员执行分发`)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '审批失败')
    }
  }

  const doReject = async () => {
    if (!rejectTarget) return
    try {
      const updated = await api.rejectDistribution(rejectTarget.id, rejectReason || '驳回')
      setRows((prev) => prev.map((x) => (x.id === rejectTarget.id ? updated : x)))
      setToast(`${rejectTarget.id} 已驳回并通知申请人`)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '驳回失败')
    } finally {
      setRejectTarget(null)
      setRejectReason('')
    }
  }

  const ship = async (r: DistributionRequest) => {
    try {
      const { distribution, lot } = await api.shipDistribution(r.id)
      setRows((prev) => prev.map((x) => (x.id === r.id ? distribution : x)))
      setToast(`${r.id} 已分发 ${r.quantity} 粒，批次 ${lot.id} 剩余 ${lot.quantity}${lot.unit}`)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '分发失败')
    }
  }

  return (
    <Box>
      <PageHeader title="分发共享" subtitle="在线申请、审批与分发执行，全流程可追溯" />

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
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, 30).map((r) => (
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
                    <StatusChip label={r.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {r.status === '待审批' && (
                        <>
                          <Button size="small" startIcon={<ApproveIcon />} color="success" onClick={() => approve(r)}>
                            批准
                          </Button>
                          <Button size="small" startIcon={<RejectIcon />} color="error" onClick={() => setRejectTarget(r)}>
                            驳回
                          </Button>
                        </>
                      )}
                      {r.status === '已批准' && (
                        <Button size="small" startIcon={<ShipIcon />} variant="contained" onClick={() => ship(r)}>
                          执行分发
                        </Button>
                      )}
                      {r.reviewComment && <Chip size="small" variant="outlined" label={r.reviewComment} sx={{ maxWidth: 160 }} />}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>驳回分发申请</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {rejectTarget?.id} · {rejectTarget?.organization}
          </Typography>
          <TextField fullWidth size="small" multiline minRows={2} label="驳回原因" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={doReject}>
            确认驳回
          </Button>
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
