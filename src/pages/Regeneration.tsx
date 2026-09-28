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
  Grid,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Add as AddIcon, ArrowForward as NextIcon } from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import { api } from '../data/api'
import type { Accession, Regeneration, RegenerationStage } from '../data/types'

const STAGES: RegenerationStage[] = ['计划', '播种', '田间管理', '收获', '入库', '已关闭']
const STAGE_COLOR: Record<RegenerationStage, string> = {
  计划: '#8fa3a0',
  播种: '#3f6ad8',
  田间管理: '#16a085',
  收获: '#d99114',
  入库: '#1b7a43',
  已关闭: '#7a8a82',
}

export default function Regeneration() {
  const [rows, setRows] = useState<Regeneration[]>([])
  const [accessions, setAccessions] = useState<Accession[]>([])
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    accessionId: '',
    reason: '库存低于临界量',
    plannedQuantity: 1000,
    plot: '试验田-1号',
    owner: '',
    sowingDate: new Date().toISOString().slice(0, 10),
    expectedHarvest: '',
  })

  useEffect(() => {
    api.listRegenerations().then(setRows).catch((e: Error) => setError(e.message))
    api.listAccessions().then(setAccessions).catch(() => undefined)
  }, [])

  const advance = async (r: Regeneration) => {
    try {
      const { regeneration, newLot } = await api.advanceRegeneration(r.id)
      setRows((prev) => prev.map((x) => (x.id === r.id ? regeneration : x)))
      setToast(newLot ? `${r.id} 已收获入库，自动创建新库存批次 ${newLot.id}` : `${r.id} 阶段推进至「${regeneration.stage}」`)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '推进失败')
    }
  }

  const submit = async () => {
    if (!form.accessionId) return
    try {
      const record = await api.createRegeneration(form)
      setRows((prev) => [record, ...prev])
      setOpen(false)
      setToast(`繁育计划 ${record.id} 已创建`)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '创建失败')
    }
  }

  return (
    <Box>
      <PageHeader
        title="繁育更新"
        subtitle="按阶段看板管理繁育计划，收获入库自动生成新批次"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            新建繁育计划
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {STAGES.map((stage) => {
          const items = rows.filter((r) => r.stage === stage)
          return (
            <Grid item xs={12} sm={6} md={2} key={stage}>
              <Box sx={{ bgcolor: '#eef3ef', borderRadius: 2, p: 1.2, minHeight: 320 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: STAGE_COLOR[stage] }}>
                    {stage}
                  </Typography>
                  <Chip size="small" label={items.length} />
                </Stack>
                <Stack spacing={1}>
                  {items.slice(0, 8).map((r) => (
                    <Card key={r.id} sx={{ p: 1.2, borderLeft: `3px solid ${STAGE_COLOR[stage]}` }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {r.id}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {r.accessionId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {r.reason}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        计划 {r.plannedQuantity} · {r.owner}
                      </Typography>
                      {r.stage !== '已关闭' && (
                        <Button size="small" endIcon={<NextIcon />} sx={{ mt: 0.5, p: 0, minWidth: 0 }} onClick={() => advance(r)}>
                          推进阶段
                        </Button>
                      )}
                    </Card>
                  ))}
                </Stack>
              </Box>
            </Grid>
          )
        })}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建繁育计划</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="目标种质" value={form.accessionId} onChange={(e) => setForm({ ...form, accessionId: e.target.value })}>
                {accessions.slice(0, 60).map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.id} · {a.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="繁育原因" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {['库存低于临界量', '活力下降需复壮', '定期更新', '遗传完整性维持'].map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" type="number" label="计划数量" value={form.plannedQuantity} onChange={(e) => setForm({ ...form, plannedQuantity: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="地块" value={form.plot} onChange={(e) => setForm({ ...form, plot: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="负责人" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" type="date" label="播种日期" InputLabelProps={{ shrink: true }} value={form.sowingDate} onChange={(e) => setForm({ ...form, sowingDate: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" type="date" label="预计收获" InputLabelProps={{ shrink: true }} value={form.expectedHarvest} onChange={(e) => setForm({ ...form, expectedHarvest: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={submit} disabled={!form.accessionId}>
            创建计划
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
