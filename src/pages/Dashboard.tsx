import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import {
  Park as EcoIcon,
  Inventory2 as InventoryIcon,
  LocalShipping as ShippingIcon,
  WarningAmber as WarnIcon,
} from '@mui/icons-material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import { api } from '../data/api'
import type { DashboardStats } from '../data/types'

const COLORS = ['#1b7a43', '#3f6ad8', '#d99114', '#8e44ad', '#16a085', '#e67e22', '#c0392b', '#2c3e50']

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboardStats().then(setStats)
  }, [])

  if (!stats) return <Typography color="text.secondary">加载中...</Typography>

  return (
    <Box>
      <PageHeader title="数据驾驶舱" subtitle="全库运行总览 · 数据更新于今日 09:00" />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="种质资源总数" value={stats.totalAccessions} caption="份" icon={<EcoIcon />} color="#1b7a43" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="库存批次" value={stats.totalLots} caption={`库存总量 ${stats.totalQuantity.toLocaleString()} 粒`} icon={<InventoryIcon />} color="#3f6ad8" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="可分发批次" value={stats.distributableLots} caption={`平均活力率 ${(stats.avgViability * 100).toFixed(1)}%`} icon={<ShippingIcon />} color="#16a085" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="未闭环预警" value={stats.pendingAlerts} caption="需及时处理" icon={<WarnIcon />} color="#c0392b" />
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="近 12 个月入库趋势" titleTypographyProps={{ variant: 'subtitle1' }} />
            <Divider />
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.monthlyIntake}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3ef" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="accessions" name="新增种质" stroke="#1b7a43" strokeWidth={2} />
                  <Line type="monotone" dataKey="lots" name="新增批次" stroke="#3f6ad8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="待办事项" titleTypographyProps={{ variant: 'subtitle1' }} />
            <Divider />
            <CardContent sx={{ pt: 1 }}>
              <List disablePadding>
                {stats.todos.map((t) => (
                  <ListItemButton
                    key={t.type}
                    onClick={() => navigate(t.type === '分发审批' ? '/distribution' : t.type === '活力复检' ? '/viability' : '/regeneration')}
                    sx={{ borderRadius: 2, mb: 0.5 }}
                  >
                    <ListItemText primary={t.label} primaryTypographyProps={{ fontSize: 14 }} />
                    <Chip label={t.count} color={t.count > 0 ? 'error' : 'default'} size="small" />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardHeader title="作物类别分布" titleTypographyProps={{ variant: 'subtitle1' }} />
            <Divider />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={stats.cropDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {stats.cropDistribution.map((_, i) => (
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

        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="活力率分布" titleTypographyProps={{ variant: 'subtitle1' }} />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                {stats.storageDistribution.map((s) => (
                  <Chip key={s.name} size="small" label={`${s.name} ${s.value}`} variant="outlined" />
                ))}
              </Stack>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.viabilityBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3ef" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <RTooltip />
                  <Bar dataKey="count" name="批次数" fill="#1b7a43" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
