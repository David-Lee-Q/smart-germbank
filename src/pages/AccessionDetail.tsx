import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import { ArrowBack as BackIcon, Print as PrintIcon } from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { api, type TimelineEvent } from '../data/api'
import type { Accession, DistributionRequest, InventoryLot, Regeneration, ViabilityTest } from '../data/types'

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  )
}

export default function AccessionDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [acc, setAcc] = useState<Accession | undefined>()
  const [lots, setLots] = useState<InventoryLot[]>([])
  const [tests, setTests] = useState<ViabilityTest[]>([])
  const [regens, setRegens] = useState<Regeneration[]>([])
  const [dists, setDists] = useState<DistributionRequest[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [tab, setTab] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.getAccession(id),
      api.listLotsByAccession(id),
      api.listAccessionViability(id),
      api.listAccessionRegenerations(id),
      api.listAccessionDistributions(id),
      api.getTimeline(id),
    ])
      .then(([a, l, t, r, d, tl]) => {
        setAcc(a)
        setLots(l)
        setTests(t)
        setRegens(r)
        setDists(d)
        setTimeline(tl)
      })
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <Typography color="error">{error}</Typography>
  if (!acc) return <Typography color="text.secondary">加载中...</Typography>

  return (
    <Box>
      <PageHeader
        title={acc.name}
        subtitle={`${acc.id} · ${acc.scientificName}`}
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button startIcon={<BackIcon />} onClick={() => navigate('/accessions')}>
              返回
            </Button>
            <Button variant="contained" startIcon={<PrintIcon />}>
              打印二维码标签
            </Button>
          </Box>
        }
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusChip label={acc.status} size="medium" />
            <Chip size="small" variant="outlined" label={acc.sourceType} />
            <Chip size="small" variant="outlined" label={`${acc.country} · ${acc.region}`} />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Field label="作物" value={acc.crop} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Field label="科" value={acc.family} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Field label="属" value={acc.genus} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Field label="保存类型" value={acc.storageType} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Field label="采集人" value={acc.collector} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Field label="采集日期" value={acc.collectedAt} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Field label="经纬度" value={`${acc.latitude}, ${acc.longitude}`} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Field label="海拔" value={`${acc.altitude} m`} />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {acc.description}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label={`库存批次 (${lots.length})`} />
          <Tab label={`活力检测 (${tests.length})`} />
          <Tab label={`繁育记录 (${regens.length})`} />
          <Tab label={`分发记录 (${dists.length})`} />
          <Tab label="事件时间线" />
        </Tabs>
        <Divider />
        <Box sx={{ p: tab === 4 ? 2 : 0, overflowX: 'auto' }}>
          {tab === 0 && (
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>批次号</TableCell>
                  <TableCell>库类型</TableCell>
                  <TableCell>货位</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell align="right">活力率</TableCell>
                  <TableCell align="right">纯活种子</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lots.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{l.id}</TableCell>
                    <TableCell>{l.storageType}</TableCell>
                    <TableCell>{`${l.room}/${l.cabinet}/${l.layer}/${l.position}`}</TableCell>
                    <TableCell align="right">{l.quantity.toLocaleString()}</TableCell>
                    <TableCell align="right">{(l.viabilityRate * 100).toFixed(0)}%</TableCell>
                    <TableCell align="right">{l.pureLiveSeed.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusChip label={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tab === 1 && (
            <Table size="small" sx={{ minWidth: 780 }}>
              <TableHead>
                <TableRow>
                  <TableCell>检测号</TableCell>
                  <TableCell>批次号</TableCell>
                  <TableCell>方法</TableCell>
                  <TableCell>取样</TableCell>
                  <TableCell align="right">发芽数</TableCell>
                  <TableCell align="right">活力率</TableCell>
                  <TableCell>检测日期</TableCell>
                  <TableCell>检测人</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tests.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{t.id}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{t.lotId}</TableCell>
                    <TableCell>{t.method}</TableCell>
                    <TableCell>{`${t.replicates}×${t.seedsPerReplicate}`}</TableCell>
                    <TableCell align="right">{t.germinated}</TableCell>
                    <TableCell align="right">{(t.viabilityRate * 100).toFixed(0)}%</TableCell>
                    <TableCell>{t.testedAt}</TableCell>
                    <TableCell>{t.tester}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tab === 2 && (
            <Table size="small" sx={{ minWidth: 660 }}>
              <TableHead>
                <TableRow>
                  <TableCell>繁育单号</TableCell>
                  <TableCell>原因</TableCell>
                  <TableCell>地块</TableCell>
                  <TableCell align="right">计划数量</TableCell>
                  <TableCell>阶段</TableCell>
                  <TableCell>负责人</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regens.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.id}</TableCell>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell>{r.plot}</TableCell>
                    <TableCell align="right">{r.plannedQuantity}</TableCell>
                    <TableCell>
                      <StatusChip label={r.stage} />
                    </TableCell>
                    <TableCell>{r.owner}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tab === 3 && (
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell>申请单号</TableCell>
                  <TableCell>申请人</TableCell>
                  <TableCell>单位</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell>用途</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dists.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{d.id}</TableCell>
                    <TableCell>{d.applicant}</TableCell>
                    <TableCell>{d.organization}</TableCell>
                    <TableCell align="right">{d.quantity}</TableCell>
                    <TableCell>{d.purpose}</TableCell>
                    <TableCell>
                      <StatusChip label={d.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {tab === 4 && (
            <Box sx={{ pl: 1 }}>
              {timeline.map((e, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, pb: 2 }}>
                  <Box sx={{ minWidth: 92, color: 'text.secondary', fontSize: 13 }}>{e.date}</Box>
                  <Box sx={{ borderLeft: '2px solid #d9e6de', pl: 2, pb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {e.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {e.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  )
}
