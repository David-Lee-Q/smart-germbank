export type StorageType = '长期库' | '中期库' | '短期库' | '复份库' | '离体库'

export type SourceType = '野外采集' | '国内交换' | '国外引进' | '育种选育' | '农家品种'

export type AccessionStatus = '正常' | '待鉴定' | '暂停分发' | '已注销'

export interface Accession {
  id: string
  name: string
  scientificName: string
  family: string
  genus: string
  crop: string
  sourceType: SourceType
  country: string
  region: string
  latitude: number
  longitude: number
  altitude: number
  collector: string
  collectedAt: string
  storageType: StorageType
  status: AccessionStatus
  introducedAt: string
  description: string
}

export type LotStatus = '正常' | '偏低' | '耗尽' | '封存'

export interface InventoryLot {
  id: string
  accessionId: string
  storageType: StorageType
  room: string
  cabinet: string
  layer: string
  position: string
  quantity: number
  unit: string
  thousandGrainWeight: number
  moisture: number
  storedAt: string
  viabilityRate: number
  pureLiveSeed: number
  criticalAmount: number
  status: LotStatus
}

export interface ViabilityTest {
  id: string
  lotId: string
  accessionId: string
  method: '发芽试验' | 'TTC染色' | '四唑染色'
  replicates: number
  seedsPerReplicate: number
  germinated: number
  viabilityRate: number
  testedAt: string
  tester: string
}

export type RegenerationStage = '计划' | '播种' | '田间管理' | '收获' | '入库' | '已关闭'

export interface Regeneration {
  id: string
  accessionId: string
  reason: string
  plannedQuantity: number
  plot: string
  stage: RegenerationStage
  owner: string
  sowingDate: string
  expectedHarvest: string
  actualHarvest: number | null
}

export type DistributionStatus = '待审批' | '已批准' | '已驳回' | '已分发'

export interface DistributionRequest {
  id: string
  accessionId: string
  lotId: string
  applicant: string
  organization: string
  quantity: number
  purpose: string
  status: DistributionStatus
  appliedAt: string
  reviewComment: string | null
}

export interface EnvReading {
  roomId: string
  roomName: string
  temperature: number
  humidity: number
  recordedAt: string
}

export interface StorageRoom {
  id: string
  name: string
  storageType: StorageType
  tempMin: number
  tempMax: number
  humidityMax: number
  online: boolean
  occupied?: number
  capacity?: number
}

export type AlertType = '库存不足' | '活力下降' | '存储超期' | '环境异常' | '设备离线'
export type AlertLevel = '严重' | '警告' | '提示'
export type AlertStatus = '未处理' | '处理中' | '已闭环'

export interface Alert {
  id: string
  type: AlertType
  level: AlertLevel
  target: string
  targetId: string
  description: string
  status: AlertStatus
  createdAt: string
}

export interface AuditLog {
  id: string
  operator: string
  action: string
  objectType: string
  objectId: string
  createdAt: string
  ip: string
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
}

export interface User {
  id: string
  account: string
  name: string
  roles: string[]
  status: '启用' | '停用'
  lastLogin: string
}

export interface DashboardStats {
  totalAccessions: number
  totalLots: number
  distributableLots: number
  pendingAlerts: number
  totalQuantity: number
  avgViability: number
  monthlyIntake: { month: string; accessions: number; lots: number }[]
  cropDistribution: { name: string; value: number }[]
  storageDistribution: { name: string; value: number }[]
  viabilityBuckets: { range: string; count: number }[]
  todos: { type: string; label: string; count: number }[]
}
