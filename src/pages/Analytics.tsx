import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Download as DownloadIcon, Search as SearchIcon } from '@mui/icons-material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import { api } from '../data/api'
import { cropOptions, sourceTypeOptions, storageTypeOptions } from '../data/options'
import { classifyViability } from '../data/analyze'
import type { Accession, InventoryLot } from '../data/types'

const COLORS = ['#1b7a43', '#3f6ad8', '#d99114', '#8e44ad', '#16a085', '#e67e22', '#c0392b', '#2c3e50']

export default function Analytics() {
  const [rows, setRows] = useState<Accession[]>([])
  const [lots, setLots] = useState<InventoryLot[]>([])
  const [keyword, setKeyword] = useState('')
  const [crop, setCrop] = useState('')
  const [source, setSource] = useState('')
  const [storage, setStorage] = useState('')
  const [viability, setViability] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listAccessions({ keyword, crop, sourceType: source, storageType: storage })
      .then(setRows)
      .catch((e: Error) => setError(e.message))
  }, [keyword, crop, source, storage])

  useEffect(() => {
    api.listInventory().then(setLots).catch(() => undefined)
  }, [])

  const filtered = useMemo(() => {
    if (!viability) return rows
    const lotsByAcc = new Map<string, number>()
    for (const l of lots) lotsByAcc.set(l.accessionId, Math.max(lotsByAcc.get(l.accessionId) ?? 0, l.viabilityRate))
    return rows.filter((a) => {
      const v = lotsByAcc.get(a.id) ?? 0
      return classifyViability(v) === viability
    })
  }, [rows, lots, viability])

  const sourceDist = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of filtered) m.set(a.sourceType, (m.get(a.sourceType) ?? 0) + 1)
    return [...m.entries()].map(([name, value]) => ({ name, value }))
  }, [filtered])

  const cropDist = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of filtered) m.set(a.crop, (m.get(a.crop) ?? 0) + 1)
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const yearDist = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of filtered) {
      const y = a.introducedAt.slice(0, 4)
      m.set(y, (m.get(y) ?? 0) + 1)
    }
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => (a.name < b.name ? -1 : 1))
  }, [filtered])

  const exportCsv = () => {
    const url = api.exportAccessionsUrl({ keyword, crop, sourceType: source, storageType: storage })
    const link = document.createElement('a')
    link.href = url
    link.download = `种质检索结果_${filtered.length}.csv`
    link.click()
    setToast(`已按当前筛选条件导出 ${filtered.length} 条检索结果`)
  }

  return (
    <Box>
      <PageHeader
        title="检索分析"
        subtitle="多条件组合检索与库存结构、来源、活力分布分析"
        action={
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportCsv}>
            导出结果
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="关键词"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="作物" value={crop} onChange={(e) => setCrop(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {cropOptions.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="来源类型" value={source} onChange={(e) => setSource(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {sourceTypeOptions.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="保存类型" value={storage} onChange={(e) => setStorage(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {storageTypeOptions.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="活力区间" value={viability} onChange={(e) => setViability(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="high">≥ 90%</MenuItem>
              <MenuItem value="mid">75% ~ 90%</MenuItem>
              <MenuItem value="low">&lt; 75%</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={`作物类别分布（${filtered.length} 份）`} titleTypographyProps={{ variant: 'subtitle1' }} />
            <Divider />
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cropDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3ef" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <RTooltip />
                  <Bar dataKey="value" name="种质数" fill="#1b7a43" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="来源类型" titleTypographyProps={{ variant: 'subtitle1' }} />
            <Divider />
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={sourceDist} dataKey="value" nameKey="name" outerRadius={85}>
                    {sourceDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="年度引种量" titleTypographyProps={{ variant: 'subtitle1' }} />
            <Divider />
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={yearDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3ef" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <RTooltip />
                  <Bar dataKey="value" name="引种数" fill="#3f6ad8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader title="检索结果" titleTypographyProps={{ variant: 'subtitle1' }} />
        <Divider />
        <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>种质编号</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>作物</TableCell>
                <TableCell>学名</TableCell>
                <TableCell>来源类型</TableCell>
                <TableCell>来源地</TableCell>
                <TableCell>保存类型</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, 200).map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{a.id}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.crop}</TableCell>
                  <TableCell sx={{ fontStyle: 'italic' }}>{a.scientificName}</TableCell>
                  <TableCell>{a.sourceType}</TableCell>
                  <TableCell>{a.region}</TableCell>
                  <TableCell>{a.storageType}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    未匹配到种质资源
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            共匹配 {filtered.length} 条，最多展示前 200 条
          </Typography>
        </Box>
      </Card>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
