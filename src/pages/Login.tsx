import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { GitHub as GitHubIcon, Park as LogoIcon, Visibility, VisibilityOff } from '@mui/icons-material'
import { REGISTER_ROLES, TRIAL_ACCOUNTS, getSession, login, register, type TrialAccount } from '../data/auth'
import { APP_VERSION, CHANGELOG, GITHUB_URL } from '../data/changelog'

const FEATURES = [
  { no: '01', title: '种质登记', desc: '种质材料智能识别与结构化登记，覆盖来源、保存类型与全生命周期信息管理' },
  { no: '02', title: '库存溯源', desc: '批次货位管理、出入库与盘点台账，纯活种子口径追踪，资源来源清晰可溯' },
  { no: '03', title: '活力检测', desc: '发芽试验、TTC 染色等多方法检测，活力率自动计算回写并触发复检预警' },
  { no: '04', title: '繁育分发', desc: '繁育阶段流转与入库自动生成新批次，分发申请、审批与库存联动扣减' },
]

const PLANT_BACKGROUNDS = [
  '/plants/plant-1.jpg',
  '/plants/plant-2.jpg',
  '/plants/plant-3.jpg',
  '/plants/plant-4.jpg',
  '/plants/plant-5.jpg',
  '/plants/plant-6.jpg',
  '/plants/plant-7.jpg',
  '/plants/plant-8.jpg',
  '/plants/plant-9.jpg',
  '/plants/plant-10.jpg',
  '/plants/plant-11.jpg',
  '/plants/plant-12.jpg',
  '/plants/plant-13.jpg',
  '/plants/plant-14.jpg',
  '/plants/plant-15.jpg',
]

function FieldLabel({ text }: { text: string }) {
  return (
    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.75, whiteSpace: 'nowrap' }}>
      {text}
    </Typography>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#f2f7f4',
    borderRadius: 1,
    '& fieldset': { borderColor: '#d9e6de' },
  },
}

export default function Login() {
  const navigate = useNavigate()

  // 每次进入登录页随机挑选一张写实植物背景
  const [plantBg] = useState(() => PLANT_BACKGROUNDS[Math.floor(Math.random() * PLANT_BACKGROUNDS.length)])

  const [tab, setTab] = useState(0)
  const [account, setAccount] = useState('admin')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loginError, setLoginError] = useState('')

  const [regAccount, setRegAccount] = useState('')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regRole, setRegRole] = useState<string>(REGISTER_ROLES[1])
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regShow, setRegShow] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [regError, setRegError] = useState('')
  const [snack, setSnack] = useState('')
  const [versionOpen, setVersionOpen] = useState(false)

  // 已登录直接进入系统
  if (getSession()) return <Navigate to="/" replace />

  function handleLogin() {
    if (!account.trim() || !password) {
      setLoginError('请输入用户名和密码')
      return
    }
    const s = login(account, password, remember)
    if (!s) {
      setLoginError('用户名或密码错误，可点击下方试用账号填入')
      return
    }
    setLoginError('')
    navigate('/', { replace: true })
  }

  function fillTrial(t: TrialAccount) {
    setTab(0)
    setAccount(t.account)
    setPassword(t.password)
    setLoginError('')
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError('')
    if (regPassword !== regConfirm) {
      setRegError('两次输入的密码不一致')
      return
    }
    if (!agreed) {
      setRegError('请先阅读并同意使用条款')
      return
    }
    const error = register({ account: regAccount, name: regName, email: regEmail, role: regRole, password: regPassword })
    if (error) {
      setRegError(error)
      return
    }
    setTab(0)
    setAccount(regAccount.trim())
    setPassword('')
    setRegPassword('')
    setRegConfirm('')
    setAgreed(false)
    setSnack('注册成功，请使用该账号登录')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: '#05271a',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${plantBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          filter: 'brightness(0.85) saturate(0.9)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 1680,
          mx: 'auto',
          display: 'flex',
          minHeight: '100vh',
        }}
      >
        {/* 左侧品牌区 */}
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            display: { xs: 'none', xl: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            px: { xl: 7 },
          }}
        >
        <Box sx={{ position: 'relative', maxWidth: 760 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 7 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #35b076 0%, #1b7a43 100%)',
                boxShadow: '0 8px 24px rgba(27,122,67,0.45)',
              }}
            >
              <LogoIcon sx={{ color: '#fff', fontSize: 30 }} />
            </Box>
            <Typography sx={{ color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
              种质资源库智能管理系统
            </Typography>
          </Box>

          <Typography sx={{ color: '#fff', fontSize: 30, fontWeight: 700, mb: 2.5, lineHeight: 1.35 }}>
            一站式种质资源智能管护平台
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.9, mb: 6, maxWidth: 480 }}>
            集成智能识别与智能检索，为种质资源库数字化转型提供全链路支撑，覆盖种质登记、库存溯源、活力检测、繁育分发到数据统计的完整流程，助力种质资源数字化、智能化管护。
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {FEATURES.map((f) => (
              <Box
                key={f.no}
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '9px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #35b076 0%, #1b7a43 100%)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {f.no}
                  </Box>
                  <Typography sx={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{f.title}</Typography>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: 12.5, lineHeight: 1.75, pl: 4.9 }}>
                  {f.desc}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              position: 'relative',
              mt: 8,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2.5,
            }}
          >
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              © 2026 种质资源库 · 让种质资源管理更简单
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => setVersionOpen(true)}
              sx={{
                background: 'none',
                border: 0,
                p: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                whiteSpace: 'nowrap',
                transition: 'color .2s',
                '&:hover': { color: '#7fe0ab' },
              }}
            >
              版本记录 v{APP_VERSION}
            </Box>
            <Link
              href={GITHUB_URL}
              target="_blank"
              rel="noopener"
              underline="hover"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                whiteSpace: 'nowrap',
                '&:hover': { color: '#7fe0ab' },
              }}
            >
              <GitHubIcon sx={{ fontSize: 16 }} />
              GitHub
            </Link>
          </Box>
        </Box>
      </Box>

        {/* 右侧表单区 */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: { xl: 640 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, md: 4 },
          }}
        >
          {/* 移动端系统名称 */}
          <Box sx={{ display: { xs: 'flex', xl: 'none' }, alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #35b076 0%, #1b7a43 100%)',
                boxShadow: '0 6px 18px rgba(27,122,67,0.40)',
              }}
            >
              <LogoIcon sx={{ color: '#fff', fontSize: 23 }} />
            </Box>
            <Typography sx={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
              种质资源库智能管理系统
            </Typography>
          </Box>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 580,
            borderRadius: '18px',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 28px 72px rgba(0,0,0,0.42)',
            p: { xs: 3, md: 4.5 },
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              mb: 3.5,
              '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
              '& .MuiTab-root': { minHeight: 52, textTransform: 'none', fontWeight: 600, fontSize: 16 },
              '& .MuiTabs-scroller': { justifyContent: 'center' },
            }}
          >
            <Tab label="登录" />
            <Tab label="注册" />
          </Tabs>

          {tab === 0 ? (
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin() }}>
              <Box sx={{ mb: 2.5 }}>
                <FieldLabel text="用户名" />
                <TextField
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  variant="outlined"
                  fullWidth
                  placeholder="请输入用户名"
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ mb: 2.5 }}>
                <FieldLabel text="密码" />
                <TextField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="outlined"
                  fullWidth
                  placeholder="请输入密码"
                  type={showPassword ? 'text' : 'password'}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      ),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>
              {loginError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {loginError}
                </Alert>
              )}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <FormControlLabel
                  control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} size="small" />}
                  label={<Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>记住我</Typography>}
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ flexShrink: 0, whiteSpace: 'nowrap', px: 5, letterSpacing: '0.3em', pl: '1.9rem', width: { xs: '100%', sm: 'auto' } }}
                >
                  登 录
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1.5, whiteSpace: 'nowrap' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>试用账号</Typography>
                <Typography variant="caption" color="text.secondary">
                  点击行或按钮自动填入表单
                </Typography>
              </Box>
              <TableContainer>
                <Table
                  size="small"
                  sx={{
                    tableLayout: { xs: 'auto', sm: 'fixed' },
                    width: '100%',
                    '& td, & th': { border: 0, textAlign: 'center', fontSize: 12.5, px: 1, py: 1.25 },
                    '& .MuiTableCell-head': { bgcolor: '#f4faf6', fontWeight: 600 },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: { sm: '16%' } }}>权限名</TableCell>
                      <TableCell sx={{ width: { sm: '18%' } }}>账号</TableCell>
                      <TableCell sx={{ width: { sm: '21%' }, display: { xs: 'none', sm: 'table-cell' } }}>密码</TableCell>
                      <TableCell sx={{ width: { sm: '32%' }, display: { xs: 'none', sm: 'table-cell' } }}>权限范围</TableCell>
                      <TableCell sx={{ width: { sm: '13%' } }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {TRIAL_ACCOUNTS.map((t) => (
                      <TableRow
                        key={t.account}
                        hover
                        onClick={() => fillTrial(t)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.role}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.account}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }}>{t.password}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }}>{t.scope}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => { e.stopPropagation(); fillTrial(t) }}
                            sx={{ whiteSpace: 'nowrap', fontSize: 12, minWidth: 0, px: 0.75 }}
                          >
                            填入
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegister}>
              <Box sx={{ mb: 2.5 }}>
                <FieldLabel text="用户名" />
                <TextField
                  value={regAccount}
                  onChange={(e) => setRegAccount(e.target.value)}
                  variant="outlined"
                  fullWidth
                  placeholder="3-20 位字母、数字或下划线"
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ mb: 2.5 }}>
                <FieldLabel text="姓名" />
                <TextField
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  variant="outlined"
                  fullWidth
                  placeholder="请输入姓名"
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ mb: 2.5 }}>
                <FieldLabel text="邮箱" />
                <TextField
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  variant="outlined"
                  fullWidth
                  placeholder="name@example.com"
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ mb: 2.5 }}>
                <FieldLabel text="角色" />
                <TextField
                  select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  variant="outlined"
                  fullWidth
                  sx={fieldSx}
                >
                  {REGISTER_ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <FieldLabel text="密码" />
                  <TextField
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="至少 6 位"
                    type={regShow ? 'text' : 'password'}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <IconButton size="small" onClick={() => setRegShow((v) => !v)} edge="end">
                            {regShow ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        ),
                      },
                    }}
                    sx={fieldSx}
                  />
                </Box>
                <Box>
                  <FieldLabel text="确认密码" />
                  <TextField
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="再次输入密码"
                    type={regShow ? 'text' : 'password'}
                    sx={fieldSx}
                  />
                </Box>
              </Box>
              {regError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {regError}
                </Alert>
              )}
              <Box
                sx={{
                  mt: 2.5,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <FormControlLabel
                  control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} size="small" />}
                  label={
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      已阅读并同意《使用条款》
                    </Typography>
                  }
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ flexShrink: 0, whiteSpace: 'nowrap', px: 5, letterSpacing: '0.3em', pl: '1.9rem', width: { xs: '100%', sm: 'auto' } }}
                >
                  注 册
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
        </Box>
      </Box>

      <Dialog open={versionOpen} onClose={() => setVersionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>版本记录</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 0.5 }}>
            {CHANGELOG.map((v) => (
              <Box key={v.version}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15 }}>v{v.version}</Typography>
                  {v.version === APP_VERSION && (
                    <Chip size="small" label="当前版本" color="success" sx={{ height: 20, fontSize: 11 }} />
                  )}
                  <Typography sx={{ color: 'text.secondary', fontSize: 12.5 }}>{v.date}</Typography>
                </Box>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {v.items.map((item) => (
                    <Typography
                      component="li"
                      key={item}
                      sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.95 }}
                    >
                      {item}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setVersionOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={3500}
        onClose={() => setSnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnack('')}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  )
}
