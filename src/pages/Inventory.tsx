import { useEffect, useMemo, useState } from 'react'
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
  LinearProgress,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  QrCodeScanner as ScanIcon,
  SwapHoriz as MoveIcon,
  Output as OutIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { api, type RoomWithOccupancy } from '../data/api'
import { storageTypeOptions } from '../data/options'
import type { InventoryLot } from '../data/types'

export default function Inventory() {
  const [rows, setRows] = useState<InventoryLot[]>([])
  const [rooms, setRooms] = useState<RoomWithOccupancy[]>([])
  const [keyword, setKeyword] = useState('')
  const [storage, setStorage] = useState('')
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const [active, setActive] = useState<InventoryLot | null>(null)
  const [outQty, setOutQty] = useState(0)
  const [outOpen, setOutOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveForm, setMoveForm] = useState({ room: '', cabinet: '', layer: '', position: '' })

  const load = () => {
    api
      .listInventory({ keyword, storageType: storage, status })
      .then((r) => {
        setRows(r)
        setPage(0)
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, storage, status])

  useEffect(() => {
    api.listRooms().then(setRooms).catch(() => undefined)
  }, [])

  const paged = useMemo(() => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [rows, page, rowsPerPage])

  const doOut = async () => {
    if (!active) return
    try {
      const updated = await api.outboundLot(active.id, outQty)
      setRows((prev) => prev.map((r) => (r.id === active.id ? updated : r)))
      setOutOpen(false)
      setToast(`出库成功：${active.id} 出库 ${outQty}${active.unit}，剩余 ${updated.quantity}${active.unit}`)
      api.listRooms().then(setRooms).catch(() => undefined)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '出库失败')
    }
  }

  const doMove = async () => {
    if (!active) return
    try {
      const updated = await api.moveLot(active.id, moveForm)
      setRows((prev) => prev.map((r) => (r.id === active.id ? updated : r)))
      setMoveOpen(false)
      setToast(`移库成功：${active.id} → ${moveForm.room}/${moveForm.cabinet}/${moveForm.layer}/${moveForm.position}`)
      api.listRooms().then(setRooms).catch(() => undefined)
    } catch (e) {
      setToast(e instanceof Error ? e.message : '移库失败')
    }
  }

  return (
    <Box>
      <PageHeader
        title="库存管理"
        subtitle="以库存批次为实体单位，按纯活种子口径管理可分发库存"
        action={
          <Button variant="contained" startIcon={<ScanIcon />} onClick={() => setToast('扫码模式：请使用 PDA 或摄像头扫描批次二维码')}>
            扫码入库
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
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="搜索批次号 / 种质编号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="库类型" value={storage} onChange={(e) => setStorage(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {storageTypeOptions.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="状态" value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {['正常', '偏低', '耗尽', '封存'].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" onClick={() => { setKeyword(''); setStorage(''); setStatus('') }}>
              重置
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="批次列表" />
          <Tab label="货位视图" />
        </Tabs>
        {tab === 0 ? (
          <>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 1120 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>批次号</TableCell>
                    <TableCell>种质编号</TableCell>
                    <TableCell>库类型</TableCell>
                    <TableCell>货位</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">活力率</TableCell>
                    <TableCell align="right">纯活种子</TableCell>
                    <TableCell align="right">含水量</TableCell>
                    <TableCell>入库日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.map((l) => (
                    <TableRow key={l.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{l.id}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{l.accessionId}</TableCell>
                      <TableCell>{l.storageType}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{`${l.room}/${l.cabinet}/${l.layer}/${l.position}`}</TableCell>
                      <TableCell align="right">
                        {l.quantity.toLocaleString()} {l.unit}
                      </TableCell>
                      <TableCell align="right">{(l.viabilityRate * 100).toFixed(0)}%</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: l.pureLiveSeed < l.criticalAmount ? 'error.main' : 'inherit' }}>
                        {l.pureLiveSeed.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">{l.moisture}%</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.storedAt}</TableCell>
                      <TableCell>
                        <StatusChip label={l.status} />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button size="small" startIcon={<OutIcon />} onClick={() => { setActive(l); setOutQty(0); setOutOpen(true) }}>
                            出库
                          </Button>
                          <Button size="small" startIcon={<MoveIcon />} onClick={() => { setActive(l); setMoveForm({ room: l.room, cabinet: l.cabinet, layer: l.layer, position: l.position }); setMoveOpen(true) }}>
                            移库
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
          </>
        ) : (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {rooms.map((room) => (
                <Grid item xs={12} md={6} key={room.id}>
                  <Card variant="outlined">
                    <Box sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1">{room.name}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip size="small" label={room.storageType} variant="outlined" />
                          <Chip size="small" color={room.online ? 'success' : 'error'} label={room.online ? '在线' : '离线'} />
                        </Stack>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        货位占用 {room.occupied}/{room.capacity} · 温度范围 {room.tempMin}~{room.tempMax}℃
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (room.occupied / room.capacity) * 100)}
                        sx={{ my: 1.5, height: 8, borderRadius: 4 }}
                      />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Array.from({ length: room.capacity }).map((_, i) => (
                          <Box
                            key={i}
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: 0.5,
                              bgcolor: i < room.occupied ? 'primary.main' : '#e8efe9',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Card>

      <Dialog open={outOpen} onClose={() => setOutOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>出库登记</DialogTitle>
        <DialogContent>
          {active && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {active.id} · 可用 {active.quantity} {active.unit} · 纯活种子 {active.pureLiveSeed}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="出库数量"
                value={outQty}
                onChange={(e) => setOutQty(Number(e.target.value))}
                error={outQty > active.quantity}
                helperText={outQty > active.quantity ? '出库数量超过可用数量' : ' '}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutOpen(false)}>取消</Button>
          <Button variant="contained" disabled={!active || outQty <= 0 || outQty > active.quantity} onClick={doOut}>
            确认出库
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>移库</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select size="small" label="库房" value={moveForm.room} onChange={(e) => setMoveForm({ ...moveForm, room: e.target.value })}>
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.name}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="存贮柜" value={moveForm.cabinet} onChange={(e) => setMoveForm({ ...moveForm, cabinet: e.target.value })} />
            <TextField size="small" label="层" value={moveForm.layer} onChange={(e) => setMoveForm({ ...moveForm, layer: e.target.value })} />
            <TextField size="small" label="位" value={moveForm.position} onChange={(e) => setMoveForm({ ...moveForm, position: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveOpen(false)}>取消</Button>
          <Button variant="contained" onClick={doMove}>
            确认移库
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
