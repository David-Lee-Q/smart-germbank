import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
  Alert,
} from '@mui/material'
import { Add as AddIcon, QrCode2 as QrIcon, Search as SearchIcon } from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { api } from '../data/api'
import { cropOptions, sourceTypeOptions, storageTypeOptions } from '../data/mock'
import type { Accession } from '../data/types'

const emptyForm = {
  name: '',
  scientificName: '',
  family: '',
  genus: '',
  crop: '水稻',
  sourceType: '野外采集',
  country: '中国',
  region: '',
  collector: '',
  collectedAt: '',
  storageType: '中期库',
  description: '',
}

export default function Accessions() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Accession[]>([])
  const [keyword, setKeyword] = useState('')
  const [crop, setCrop] = useState('')
  const [source, setSource] = useState('')
  const [storage, setStorage] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')

  useEffect(() => {
    api.listAccessions({ keyword, crop, sourceType: source, storageType: storage }).then((r) => {
      setRows(r)
      setPage(0)
    })
  }, [keyword, crop, source, storage])

  const paged = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage],
  )

  const submit = async () => {
    try {
      const created = await api.createAccession({
        name: form.name,
        scientificName: form.scientificName,
        family: form.family,
        genus: form.genus,
        crop: form.crop,
        sourceType: form.sourceType as Accession['sourceType'],
        country: form.country,
        region: form.region,
        collector: form.collector,
        collectedAt: form.collectedAt,
        storageType: form.storageType as Accession['storageType'],
        description: form.description,
      })
      setRows((prev) => [created, ...prev])
      setOpen(false)
      setForm(emptyForm)
      setToast(`种质已登记，编号 ${created.id}，二维码已生成`)
    } catch (e) {
      setToast(e instanceof Error ? `登记失败：${e.message}` : '登记失败')
    }
  }

  return (
    <Box>
      <PageHeader
        title="种质资源"
        subtitle="种质身份与护照数据管理，支持二维码标签与全流程追溯"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            登记种质
          </Button>
        }
      />

      <Card sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="搜索编号 / 名称 / 学名 / 来源地 / 采集人"
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
            <Button fullWidth variant="outlined" onClick={() => { setKeyword(''); setCrop(''); setSource(''); setStorage('') }}>
              重置
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 1040 }}>
            <TableHead>
              <TableRow>
                <TableCell>种质编号</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>作物</TableCell>
                <TableCell>学名</TableCell>
                <TableCell>来源类型</TableCell>
                <TableCell>来源地</TableCell>
                <TableCell>采集人</TableCell>
                <TableCell>保存类型</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{a.id}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.crop}</TableCell>
                  <TableCell sx={{ fontStyle: 'italic' }}>{a.scientificName}</TableCell>
                  <TableCell>{a.sourceType}</TableCell>
                  <TableCell>{a.region}</TableCell>
                  <TableCell>{a.collector}</TableCell>
                  <TableCell>{a.storageType}</TableCell>
                  <TableCell>
                    <StatusChip label={a.status} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Button size="small" onClick={() => navigate(`/accessions/${a.id}`)}>
                        详情
                      </Button>
                      <Button size="small" startIcon={<QrIcon />} onClick={() => setToast(`${a.id} 二维码标签已生成`)}>
                        标签
                      </Button>
                    </Stack>
                  </TableCell>
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>登记种质资源</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" required label="种质名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" required label="学名" value={form.scientificName} onChange={(e) => setForm({ ...form, scientificName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="科" value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="属" value={form.genus} onChange={(e) => setForm({ ...form, genus: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField select fullWidth size="small" label="作物" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>
                {cropOptions.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField select fullWidth size="small" label="来源类型" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
                {sourceTypeOptions.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="国家" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="省/地区" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="采集人" value={form.collector} onChange={(e) => setForm({ ...form, collector: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" type="date" label="采集日期" InputLabelProps={{ shrink: true }} value={form.collectedAt} onChange={(e) => setForm({ ...form, collectedAt: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField select fullWidth size="small" label="保存类型" value={form.storageType} onChange={(e) => setForm({ ...form, storageType: e.target.value })}>
                {storageTypeOptions.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" multiline minRows={2} label="描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={submit} disabled={!form.name || !form.scientificName}>
            保存并生成二维码
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
