import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Park as EcoIcon,
  Inventory2 as InventoryIcon,
  Science as ScienceIcon,
  Autorenew as RegenIcon,
  LocalShipping as DistributionIcon,
  QueryStats as AnalyticsIcon,
  DeviceThermostat as EnvIcon,
  NotificationsActive as AlertIcon,
  AdminPanelSettings as AdminIcon,
  Menu as MenuIcon,
  NotificationsNone as BellIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { api } from '../data/api'
import { getSession, logout } from '../data/auth'

const drawerWidth = 232

const navItems = [
  { label: '数据驾驶舱', path: '/', icon: <DashboardIcon /> },
  { label: '种质资源', path: '/accessions', icon: <EcoIcon /> },
  { label: '库存管理', path: '/inventory', icon: <InventoryIcon /> },
  { label: '活力检测', path: '/viability', icon: <ScienceIcon /> },
  { label: '繁育更新', path: '/regeneration', icon: <RegenIcon /> },
  { label: '分发共享', path: '/distribution', icon: <DistributionIcon /> },
  { label: '检索分析', path: '/analytics', icon: <AnalyticsIcon /> },
  { label: '环境监测', path: '/environment', icon: <EnvIcon /> },
  { label: '预警中心', path: '/alerts', icon: <AlertIcon /> },
  { label: '系统管理', path: '/system', icon: <AdminIcon /> },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingAlerts, setPendingAlerts] = useState(0)
  const current = navItems.find((n) => n.path === location.pathname)

  useEffect(() => {
    let active = true
    const load = () => {
      api
        .getAlertSummary()
        .then((s) => {
          if (active) setPendingAlerts(s.pending)
        })
        .catch(() => undefined)
    }
    load()
    const timer = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [location.pathname])

  const session = getSession()
  if (!session) {
    return <Navigate to="/login" replace />
  }

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#0f2e21', color: '#d7e6de' }}>
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EcoIcon sx={{ color: '#6fd39a' }} />
          <Typography variant="subtitle1" sx={{ color: '#ffffff', lineHeight: 1.2 }}>
            种质资源库
            <Box component="span" sx={{ display: 'block', fontSize: 11, color: '#8fb7a3', fontWeight: 500 }}>
              智能管理系统
            </Box>
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <List sx={{ px: 1.2, py: 1 }}>
        {navItems.map((item) => {
          const selected = location.pathname === item.path
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => {
                navigate(item.path)
                setMobileOpen(false)
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: selected ? '#ffffff' : '#b9cfc4',
                '&.Mui-selected': { bgcolor: '#1b7a43', '&:hover': { bgcolor: '#1e8a4b' } },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
              {item.path === '/alerts' && pendingAlerts > 0 && (
                <Chip label={pendingAlerts} size="small" sx={{ height: 18, fontSize: 11, bgcolor: '#c0392b', color: '#fff' }} />
              )}
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: '#ffffff',
          color: 'text.primary',
          borderBottom: '1px solid #e4ece7',
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontSize: 18, minWidth: 0 }}>
            {current?.label ?? '种质资源库'}
          </Typography>
          <Tooltip title="预警中心">
            <IconButton onClick={() => navigate('/alerts')}>
              <Badge badgeContent={pendingAlerts} color="error">
                <BellIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>{session.name.slice(0, 1)}</Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                {session.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {session.role}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="退出登录">
            <IconButton
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, border: 0 } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
