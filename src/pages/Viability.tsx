import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Chip,
} from '@mui/material'
import { Add as AddIcon, Science as ScienceIcon } from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import { api, type OverdueItem } from '../data/api'
import type { InventoryLot, ViabilityTest } from '../data/types'

const emptyForm = {
  lotId: '',
  method: '发芽试验' as ViabilityTest['method'],
  replicates: 4,
  seedsPerReplicate: 50,
  counts: '',
  testedAt: new Date().toISOString().slice(0, 10),
  tester: '',
}

export default function Viability() {
  const [rows, setRows] = useState<ViabilityTest[]>([])
  const [lots, setLots] = useState<InventoryLot[]>([])
  const [overdue, setOverdue] = useState<OverdueItem[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    Promise.all([api.listViability(), api.listOverdueViability()])
      .then(([tests, od]) => {
        setRows(tests)
        setOverdue(od)
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    load()
    api.listInventory().then(setLots).catch(() => undefined)
  }, [])

  const paged = useMemo(() => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [rows, page, rowsPerPage])

  const parsedCounts = form.counts
    .split(/[,，\s]+/)
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n) && n >= 0)
  const totalSeeds = form.replicates * form.seedsPerReplicate
  const germinatedSum = parsedCounts.reduce((a, b) => a + b, 0)
  const previewRate = totalSeeds > 0 ? germinatedSum / totalSeeds : 0

  const submit = async () => {
    try {
      const { test } = await api.createViability({
        lotId: form.lotId,
        method: form.method,
        replicates: form.replicates,
        seedsPerReplicate: form.seedsPerReplicate,
        counts: parsedCounts,
        testedAt: form.testedAt,
        tester: form.tester,
      })
      setRows((prev) => [test, ...prev])
      setOpen(false)
      setForm(emptyForm)
      setToast(`检测登记成功，活力率 ${(test.viabilityRate * 100).toFixed(1)}%，已回写批次 ${test.lotId}`)
      load()
    } catch (e) {
      setToast(e instanceof Error ? `登记失败：${e.message}` : '登记失败')
    }
  }

  const activeLots = lots.filter((l) => l.quantity > 0).slice(0, 60)

  return (
    <Box>
      <PageHeader
        title="活力检测"
        subtitle="发芽试验 / 染色试验登记，结果自动回写批次并计算纯活种子"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            登记检测
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ScienceIcon color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  检测记录总数
                </Typography>
                <Typography variant="h6">{rows.length}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              活力偏低批次（活力率 &lt; 75%）
            </Typography>
            <Typography variant="h6" color="warning.main">
              {overdue.filter((o) => o.lot.viabilityRate < 0.75).length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              需复检批次（超过 24 个月未检测）
            </Typography>
            <Typography variant="h6" color="error.main">
              {overdue.length}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>检测号</TableCell>
                <TableCell>种质编号</TableCell>
                <TableCell>批次号</TableCell>
                <TableCell>方法</TableCell>
                <TableCell>重复 × 取样</TableCell>
                <TableCell align="right">发芽数</TableCell>
                <TableCell align="right">活力率</TableCell>
                <TableCell>检测日期</TableCell>
                <TableCell>检测人</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{t.id}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{t.accessionId}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{t.lotId}</TableCell>
                  <TableCell>{t.method}</TableCell>
                  <TableCell>{`${t.replicates} × ${t.seedsPerReplicate}`}</TableCell>
                  <TableCell align="right">{t.germinated}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      label={`${(t.viabilityRate * 100).toFixed(0)}%`}
                      color={t.viabilityRate >= 0.85 ? 'success' : t.viabilityRate >= 0.75 ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell>{t.testedAt}</TableCell>
                  <TableCell>{t.tester}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>登记活力检测</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField select fullWidth size="small" label="库存批次" value={form.lotId} onChange={(e) => setForm({ ...form, lotId: e.target.value })}>
                {activeLots.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.id} · {l.accessionId} · 现有 {l.quantity}
                    {l.unit}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="检测方法" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as ViabilityTest['method'] })}>
                {['发芽试验', 'TTC染色', '四唑染色'].map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth size="small" type="number" label="重复数" value={form.replicates} onChange={(e) => setForm({ ...form, replicates: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth size="small" type="number" label="每重复取样数" value={form.seedsPerReplicate} onChange={(e) => setForm({ ...form, seedsPerReplicate: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="各重复发芽数（逗号分隔）"
                placeholder="例如：45,48,44,46"
                value={form.counts}
                onChange={(e) => setForm({ ...form, counts: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="date" label="检测日期" InputLabelProps={{ shrink: true }} value={form.testedAt} onChange={(e) => setForm({ ...form, testedAt: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="检测人" value={form.tester} onChange={(e) => setForm({ ...form, tester: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <Alert severity={previewRate >= 0.85 ? 'success' : previewRate >= 0.75 ? 'warning' : 'error'} icon={false}>
                活力率预览：<b>{(previewRate * 100).toFixed(1)}%</b>（{germinatedSum} / {totalSeeds}）
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" disabled={!form.lotId || totalSeeds <= 0 || parsedCounts.length === 0} onClick={submit}>
            保存并回写批次
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
