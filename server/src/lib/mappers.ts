import type {
  Accession,
  Alert,
  ApprovalNode,
  AuditLog,
  DistributionRequest,
  EnvReading,
  InventoryLot,
  Regeneration,
  Role,
  StorageRoom,
  User,
  ViabilityTest,
} from '../types.js'

type Row = Record<string, unknown>

export const toAccession = (r: Row): Accession => ({
  id: r.id as string,
  name: r.name as string,
  scientificName: r.scientific_name as string,
  family: r.family as string,
  genus: r.genus as string,
  crop: r.crop as string,
  sourceType: r.source_type as Accession['sourceType'],
  country: r.country as string,
  region: r.region as string,
  latitude: r.latitude as number,
  longitude: r.longitude as number,
  altitude: r.altitude as number,
  collector: r.collector as string,
  collectedAt: r.collected_at as string,
  storageType: r.storage_type as Accession['storageType'],
  status: r.status as Accession['status'],
  introducedAt: r.introduced_at as string,
  description: r.description as string,
})

export const toLot = (r: Row): InventoryLot => ({
  id: r.id as string,
  accessionId: r.accession_id as string,
  storageType: r.storage_type as InventoryLot['storageType'],
  room: r.room as string,
  cabinet: r.cabinet as string,
  layer: r.layer as string,
  position: r.position as string,
  quantity: r.quantity as number,
  unit: r.unit as string,
  thousandGrainWeight: r.thousand_grain_weight as number,
  moisture: r.moisture as number,
  storedAt: r.stored_at as string,
  viabilityRate: r.viability_rate as number,
  pureLiveSeed: r.pure_live_seed as number,
  criticalAmount: r.critical_amount as number,
  status: r.status as InventoryLot['status'],
})

export const toViabilityTest = (r: Row): ViabilityTest => ({
  id: r.id as string,
  lotId: r.lot_id as string,
  accessionId: r.accession_id as string,
  method: r.method as ViabilityTest['method'],
  replicates: r.replicates as number,
  seedsPerReplicate: r.seeds_per_replicate as number,
  germinated: r.germinated as number,
  viabilityRate: r.viability_rate as number,
  testedAt: r.tested_at as string,
  tester: r.tester as string,
})

export const toRegeneration = (r: Row): Regeneration => ({
  id: r.id as string,
  accessionId: r.accession_id as string,
  reason: r.reason as string,
  plannedQuantity: r.planned_quantity as number,
  plot: r.plot as string,
  stage: r.stage as Regeneration['stage'],
  owner: r.owner as string,
  sowingDate: r.sowing_date as string,
  expectedHarvest: r.expected_harvest as string,
  actualHarvest: (r.actual_harvest as number | null) ?? null,
})

export const toDistribution = (r: Row): DistributionRequest => ({
  id: r.id as string,
  accessionId: r.accession_id as string,
  lotId: r.lot_id as string,
  applicant: r.applicant as string,
  organization: r.organization as string,
  quantity: r.quantity as number,
  purpose: r.purpose as string,
  status: r.status as DistributionRequest['status'],
  appliedAt: r.applied_at as string,
  reviewComment: (r.review_comment as string | null) ?? null,
})

export const toApprovalNode = (r: Row): ApprovalNode => ({
  id: r.id as string,
  round: r.round as number,
  seq: r.seq as number,
  nodeName: r.node_name as string,
  role: r.role as string,
  approver: r.approver as string,
  comment: (r.comment as string | null) ?? null,
  status: r.status as ApprovalNode['status'],
  actedAt: (r.acted_at as string | null) ?? null,
})

export const toRoom = (r: Row): StorageRoom => ({
  id: r.id as string,
  name: r.name as string,
  storageType: r.storage_type as StorageRoom['storageType'],
  tempMin: r.temp_min as number,
  tempMax: r.temp_max as number,
  humidityMax: r.humidity_max as number,
  online: Boolean(r.online),
})

export const toEnvReading = (r: Row): EnvReading => ({
  roomId: r.room_id as string,
  roomName: r.room_name as string,
  temperature: r.temperature as number,
  humidity: r.humidity as number,
  recordedAt: r.recorded_at as string,
})

export const toAlert = (r: Row): Alert => ({
  id: r.id as string,
  type: r.type as Alert['type'],
  level: r.level as Alert['level'],
  target: r.target as string,
  targetId: r.target_id as string,
  description: r.description as string,
  status: r.status as Alert['status'],
  createdAt: r.created_at as string,
})

export const toAuditLog = (r: Row): AuditLog => ({
  id: r.id as string,
  operator: r.operator as string,
  action: r.action as string,
  objectType: r.object_type as string,
  objectId: r.object_id as string,
  createdAt: r.created_at as string,
  ip: r.ip as string,
})

export const toUser = (r: Row): User => ({
  id: r.id as string,
  account: r.account as string,
  name: r.name as string,
  roles: JSON.parse(r.roles as string) as string[],
  status: r.status as User['status'],
  lastLogin: r.last_login as string,
})

export const toRole = (r: Row): Role => ({
  id: r.id as string,
  name: r.name as string,
  description: r.description as string,
  permissions: JSON.parse(r.permissions as string) as string[],
})
