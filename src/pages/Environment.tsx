import { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { DeviceThermostat as TempIcon, WaterDrop as HumidityIcon, Wifi as OnlineIcon, WifiOff as OfflineIcon } from '@mui/icons-material'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { api } from '../data/api'
import type { Alert as AlertModel, EnvReading, StorageRoom } from '../data/types'

export default function Environment() {
  const [rooms, setRooms] = useState<StorageRoom[]>([])
  const [roomId, setRoomId] = useState('')
  const [readings, setReadings] = useState<EnvReading[]>([])
  const [envAlerts, setEnvAlerts] = useState<AlertModel[]>([])

  useEffect(() => {
    api.listRooms().then((rs) => {
      setRooms(rs)
      if (rs[0]) setRoomId(rs[0].id)
    })
    api
      .listAlerts()
      .then((list) => setEnvAlerts(list.filter((a) => ['环境异常', '设备离线', '存储超期'].includes(a.type)).slice(0, 8)))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (roomId) api.listEnvReadings(roomId).then(setReadings)
  }, [roomId])

  const room = rooms.find((r) => r.id === roomId)
  const latest = readings[readings.length - 1]
  const tempOut = latest && room ? latest.temperature < room.tempMin || latest.temperature > room.tempMax : false
  const humidityOut = latest && room ? latest.humidity > room.humidityMax : false

  return (
    <Box>
      <PageHeader title="环境监测" subtitle="库房温湿度实时监控与设备状态，超限自动告警" />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {rooms.map((r) => (
          <Grid item xs={12} sm={6} md={2.4} key={r.id}>
            <Card
              onClick={() => setRoomId(r.id)}
              sx={{ cursor: 'pointer', borderColor: roomId === r.id ? 'primary.main' : undefined, borderWidth: roomId === r.id ? 2 : 1 }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">{r.name}</Typography>
                  {r.online ? <OnlineIcon color="success" fontSize="small" /> : <OfflineIcon color="error" fontSize="small" />}
                </Stack>
                <Chip size="small" variant="outlined" label={r.storageType} sx={{ my: 1 }} />
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <TempIcon fontSize="small" color="primary" />
                    <Typography variant="body2">{r.tempMin}~{r.tempMax}℃</Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                  <HumidityIcon fontSize="small" color="info" />
                  <Typography variant="body2">≤{r.humidityMax}%RH</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1">近 24 小时趋势 · {room?.name}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField select size="small" value={roomId} onChange={(e) => setRoomId(e.target.value)} sx={{ minWidth: 160 }}>
                  {rooms.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Chip
                  label={tempOut || humidityOut ? '超限' : '正常'}
                  color={tempOut || humidityOut ? 'error' : 'success'}
                  size="small"
                />
              </Stack>
            </Box>
            <Divider />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3ef" />
                  <XAxis dataKey="recordedAt" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <RTooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="temperature" name="温度(℃)" stroke="#c0392b" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="humidity" name="湿度(%RH)" stroke="#3f6ad8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              {latest && (
                <Typography variant="caption" color="text.secondary">
                  最新采集：{latest.recordedAt} · 温度 {latest.temperature}℃ · 湿度 {latest.humidity}%RH
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1">环境告警</Typography>
            </Box>
            <Divider />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>库房</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>级别</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {envAlerts.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>{a.target}</TableCell>
                    <TableCell>{a.type}</TableCell>
                    <TableCell>
                      <StatusChip label={a.level} />
                    </TableCell>
                    <TableCell>
                      <StatusChip label={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {envAlerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      暂无环境告警
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
