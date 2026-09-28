import { useEffect, useState } from 'react'
import {
  Box,
  Card,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { api } from '../data/api'
import type { AuditLog, Role, User } from '../data/types'

export default function System() {
  const [tab, setTab] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [dictionaries, setDictionaries] = useState<Record<string, string[]>>({})

  useEffect(() => {
    api.listUsers().then(setUsers)
    api.listRoles().then(setRoles)
    api.listAuditLogs().then(setLogs)
    api.listDictionaries().then(setDictionaries)
  }, [])

  return (
    <Box>
      <PageHeader title="系统管理" subtitle="用户、角色权限、数据字典与操作审计" />

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label="用户管理" />
          <Tab label="角色权限" />
          <Tab label="数据字典" />
          <Tab label="审计日志" />
        </Tabs>
        <Divider />

        {tab === 0 && (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 620 }}>
              <TableHead>
                <TableRow>
                  <TableCell>账号</TableCell>
                  <TableCell>姓名</TableCell>
                  <TableCell>角色</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>最近登录</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{u.account}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{u.name}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                        {u.roles.map((r) => (
                          <Chip key={r} size="small" label={r} variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <StatusChip label={u.status} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{u.lastLogin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {roles.map((r) => (
                <Grid item xs={12} md={4} key={r.id}>
                  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1">{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {r.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {r.permissions.map((p) => (
                        <Chip key={p} size="small" label={p} color={p === '*' ? 'primary' : 'default'} />
                      ))}
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 2 && (
          <Grid container spacing={2} sx={{ p: 2 }}>
            {Object.entries(dictionaries).map(([name, items]) => (
              <Grid item xs={12} md={3} key={name}>
                <Card variant="outlined">
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {name}
                    </Typography>
                    <List dense disablePadding>
                      {items.map((it) => (
                        <ListItem key={it} disableGutters sx={{ py: 0.2 }}>
                          <ListItemText primary={it} primaryTypographyProps={{ fontSize: 13 }} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {tab === 3 && (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 880 }}>
              <TableHead>
                <TableRow>
                  <TableCell>日志编号</TableCell>
                  <TableCell>操作人</TableCell>
                  <TableCell>动作</TableCell>
                  <TableCell>对象类型</TableCell>
                  <TableCell>对象标识</TableCell>
                  <TableCell>时间</TableCell>
                  <TableCell>IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.slice(0, 40).map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{l.id}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.operator}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.action}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.objectType}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{l.objectId}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.createdAt}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{l.ip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  )
}
