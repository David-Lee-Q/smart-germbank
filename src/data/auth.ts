export interface Session {
  account: string
  name: string
  role: string
}

export interface TrialAccount {
  role: string
  name: string
  account: string
  password: string
  scope: string
}

const SESSION_KEY = 'germplasm.session'
const REGISTERED_KEY = 'germplasm.registered'

export const TRIAL_ACCOUNTS: TrialAccount[] = [
  { role: '系统管理员', name: '系统管理员', account: 'admin', password: 'Germplasm@2026', scope: '全部功能' },
  { role: '库管员', name: '张伟', account: 'curator01', password: 'curator01', scope: '登记、出入库、盘点' },
  { role: '研究人员', name: '李静', account: 'researcher01', password: 'researcher01', scope: '检索、检测、分发申请' },
]

export const REGISTER_ROLES = ['库管员', '研究人员', '访客'] as const

interface RegisteredUser {
  account: string
  name: string
  email: string
  role: string
  password: string
}

function readRegistered(): RegisteredUser[] {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_KEY) ?? '[]') as RegisteredUser[]
  } catch {
    return []
  }
}

function writeRegistered(users: RegisteredUser[]): void {
  localStorage.setItem(REGISTERED_KEY, JSON.stringify(users))
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    return s && s.account ? s : null
  } catch {
    return null
  }
}

export function login(account: string, password: string, remember: boolean): Session | null {
  const trimmed = account.trim()
  const trial = TRIAL_ACCOUNTS.find((t) => t.account === trimmed)
  if (trial && trial.password === password) {
    const session: Session = { account: trial.account, name: trial.name, role: trial.role }
    persistSession(session, remember)
    return session
  }
  const registered = readRegistered().find((u) => u.account === trimmed)
  if (registered && registered.password === password) {
    const session: Session = { account: registered.account, name: registered.name, role: registered.role }
    persistSession(session, remember)
    return session
  }
  return null
}

function persistSession(session: Session, remember: boolean): void {
  const raw = JSON.stringify(session)
  if (remember) {
    localStorage.setItem(SESSION_KEY, raw)
    sessionStorage.removeItem(SESSION_KEY)
  } else {
    sessionStorage.setItem(SESSION_KEY, raw)
    localStorage.removeItem(SESSION_KEY)
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export interface RegisterInput {
  account: string
  name: string
  email: string
  role: string
  password: string
}

export function register(input: RegisterInput): string | null {
  const account = input.account.trim()
  if (!account) return '用户名不能为空'
  if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(account)) return '用户名需为 3~20 位字母、数字或下划线，且以字母开头'
  if (!input.name.trim()) return '姓名不能为空'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return '邮箱格式不正确'
  if (input.password.length < 6) return '密码至少 6 位'
  if (TRIAL_ACCOUNTS.some((t) => t.account === account)) return '该用户名已被试用账号占用'
  if (readRegistered().some((u) => u.account === account)) return '该用户名已注册'
  const users = readRegistered()
  users.push({ account, name: input.name.trim(), email: input.email.trim(), role: input.role, password: input.password })
  writeRegistered(users)
  return null
}
