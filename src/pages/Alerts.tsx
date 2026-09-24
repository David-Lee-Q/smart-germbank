import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Grid,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { CheckCircle as CloseIcon, PlayArrow as HandleIcon } from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { api } from '../data/api'
import type { Alert as AlertModel } from '../data/types'

const TYPE_OPTIONS = ['库存不足', '活力下降', '存储超期', '环境异常', '设备离线']
const LEVEL_OPTIONS = ['严重', '警告', '提示']
const STATUS_OPTIONS = ['未处理', '处理中', '已闭环']

export default function Alerts() {
  const [rows, setRows] = useState<AlertModel[]>([])
  const [type, setType] = useState('')
  const [level, setLevel] = useState('')
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    api.listAlerts().then(setRows)
  }, [])

  const filtered = rows.filter((a) => (!type || a.type === type) && (!level || a.level === level) && (!status || a.status === status))

  const setStatusOf = async (id: string, next: AlertModel['status']) => {
    try {
      const updated = await api.handleAlert(id, next)
      setRows((prev) => prev.map((a) => (a.id === id ? updated : a)))
      setToast(`预警 ${id} 已更新为「${next}」`)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '更新失败')
    }
  }

  const counts = {
    total: rows.length,
    pending: rows.filter((a) => a.status === '未处理').length,
    severe: rows.filter((a) => a.level === '严重' && a.status !== '已闭环').length,
    closed: rows.filter((a) => a.status === '已闭环').length,
  }

  return (
    <Box>
      <PageHeader title="预警中心" subtitle="库存、活力、存储时长与环境风险的统一闭环管理" />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: '预警总数', value: counts.total, color: 'text.primary' },
          { label: '未处理', value: counts.pending, color: 'error.main' },
          { label: '严重且未闭环', value: counts.severe, color: 'error.main' },
          { label: '已闭环', value: counts.closed, color: 'success.main' },
        ].map((c) => (
          <Grid item xs={6} md={3} key={c.label}>
            <Card sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {c.label}
              </Typography>
              <Typography variant="h5" sx={{ color: c.color, fontWeight: 700 }}>
                {c.value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="预警类型" value={type} onChange={(e) => setType(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {TYPE_OPTIONS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="级别" value={level} onChange={(e) => setLevel(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {LEVEL_OPTIONS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="状态" value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {STATUS_OPTIONS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <Button fullWidth variant="outlined" onClick={() => { setType(''); setLevel(''); setStatus('') }}>
              重置
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>预警号</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>级别</TableCell>
                <TableCell>对象</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>产生时间</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, 40).map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{a.id}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={a.type} />
                  </TableCell>
                  <TableCell>
                    <StatusChip label={a.level} />
                  </TableCell>
                  <TableCell>{a.target}</TableCell>
                  <TableCell sx={{ maxWidth: 380 }}>{a.description}</TableCell>
                  <TableCell>{a.createdAt}</TableCell>
                  <TableCell>
                    <StatusChip label={a.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {a.status === '未处理' && (
                        <Button size="small" startIcon={<HandleIcon />} onClick={() => setStatusOf(a.id, '处理中')}>
                          开始处理
                        </Button>
                      )}
                      {a.status !== '已闭环' && (
                        <Button size="small" color="success" startIcon={<CloseIcon />} onClick={() => setStatusOf(a.id, '已闭环')}>
                          闭环
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    暂无预警
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
