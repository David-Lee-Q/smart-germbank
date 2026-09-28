import type {
  Accession,
  Alert,
  AuditLog,
  DashboardStats,
  DistributionRequest,
  EnvReading,
  InventoryLot,
  Regeneration,
  Role,
  StorageRoom,
  User,
  ViabilityTest,
} from './types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let message = `请求失败 (${res.status})`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      if (body?.error?.message) message = body.error.message
    } catch {
      /* ignore parse error */
    }
    throw new Error(message)
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return (await res.json()) as T
  return (await res.text()) as unknown as T
}

function qs(params: object): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params) as [string, string | undefined][]) {
    if (v) search.set(k, v)
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export interface AccessionQuery {
  keyword?: string
  crop?: string
  sourceType?: string
  storageType?: string
  status?: string
}

export interface InventoryQuery {
  keyword?: string
  storageType?: string
  status?: string
}

export interface TimelineEvent {
  date: string
  title: string
  desc: string
}

export interface OverdueItem {
  lot: InventoryLot
  lastTested: string | null
}

export interface AlertSummary {
  total: number
  pending: number
  severe: number
  closed: number
}

export interface RoomWithOccupancy extends StorageRoom {
  occupied: number
  capacity: number
}

export interface RoomLatest {
  room: StorageRoom
  reading: EnvReading
  abnormal: boolean
  tempOut: boolean
  humidityOut: boolean
}

export const api = {
  async listAccessions(query: AccessionQuery = {}): Promise<Accession[]> {
    return request<Accession[]>(`/accessions${qs(query)}`)
  },
  async getAccession(id: string): Promise<Accession> {
    return request<Accession>(`/accessions/${encodeURIComponent(id)}`)
  },
  async createAccession(payload: Partial<Accession>): Promise<Accession> {
    return request<Accession>('/accessions', { method: 'POST', body: JSON.stringify(payload) })
  },
  async listLotsByAccession(accessionId: string): Promise<InventoryLot[]> {
    return request<InventoryLot[]>(`/accessions/${encodeURIComponent(accessionId)}/lots`)
  },
  async listAccessionViability(accessionId: string): Promise<ViabilityTest[]> {
    return request<ViabilityTest[]>(`/accessions/${encodeURIComponent(accessionId)}/viability`)
  },
  async listAccessionRegenerations(accessionId: string): Promise<Regeneration[]> {
    return request<Regeneration[]>(`/accessions/${encodeURIComponent(accessionId)}/regenerations`)
  },
  async listAccessionDistributions(accessionId: string): Promise<DistributionRequest[]> {
    return request<DistributionRequest[]>(`/accessions/${encodeURIComponent(accessionId)}/distributions`)
  },
  async getTimeline(accessionId: string): Promise<TimelineEvent[]> {
    return request<TimelineEvent[]>(`/accessions/${encodeURIComponent(accessionId)}/timeline`)
  },
  exportAccessionsUrl(query: AccessionQuery = {}): string {
    return `${BASE}/accessions/export${qs(query)}`
  },

  async listInventory(query: InventoryQuery = {}): Promise<InventoryLot[]> {
    return request<InventoryLot[]>(`/inventory${qs(query)}`)
  },
  async createLot(payload: Record<string, unknown>): Promise<InventoryLot> {
    return request<InventoryLot>('/inventory', { method: 'POST', body: JSON.stringify(payload) })
  },
  async outboundLot(id: string, quantity: number, reason?: string): Promise<InventoryLot> {
    return request<InventoryLot>(`/inventory/${encodeURIComponent(id)}/outbound`, {
      method: 'POST',
      body: JSON.stringify({ quantity, reason }),
    })
  },
  async moveLot(id: string, location: { room: string; cabinet: string; layer: string; position: string }): Promise<InventoryLot> {
    return request<InventoryLot>(`/inventory/${encodeURIComponent(id)}/move`, { method: 'POST', body: JSON.stringify(location) })
  },
  async stocktakeLot(id: string, actualQuantity: number, reason?: string) {
    return request<{ lotId: string; bookQuantity: number; actualQuantity: number; diff: number; reason: string }>(
      `/inventory/${encodeURIComponent(id)}/stocktake`,
      { method: 'POST', body: JSON.stringify({ actualQuantity, reason }) },
    )
  },

  async listViability(): Promise<ViabilityTest[]> {
    return request<ViabilityTest[]>('/viability')
  },
  async listOverdueViability(): Promise<OverdueItem[]> {
    return request<OverdueItem[]>('/viability/overdue')
  },
  async createViability(payload: {
    lotId: string
    method: string
    replicates: number
    seedsPerReplicate: number
    counts: number[]
    testedAt?: string
    tester?: string
  }): Promise<{ test: ViabilityTest; lot: InventoryLot }> {
    return request<{ test: ViabilityTest; lot: InventoryLot }>('/viability', { method: 'POST', body: JSON.stringify(payload) })
  },

  async listRegenerations(): Promise<Regeneration[]> {
    return request<Regeneration[]>('/regenerations')
  },
  async listRegenerationBoard(): Promise<{ stage: string; items: Regeneration[] }[]> {
    return request<{ stage: string; items: Regeneration[] }[]>('/regenerations/board')
  },
  async createRegeneration(payload: Record<string, unknown>): Promise<Regeneration> {
    return request<Regeneration>('/regenerations', { method: 'POST', body: JSON.stringify(payload) })
  },
  async advanceRegeneration(id: string): Promise<{ regeneration: Regeneration; newLot: InventoryLot | null }> {
    return request<{ regeneration: Regeneration; newLot: InventoryLot | null }>(`/regenerations/${encodeURIComponent(id)}/advance`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  },

  async listDistributions(status?: string): Promise<DistributionRequest[]> {
    return request<DistributionRequest[]>(`/distributions${qs({ status })}`)
  },
  async createDistribution(payload: Record<string, unknown>): Promise<DistributionRequest> {
    return request<DistributionRequest>('/distributions', { method: 'POST', body: JSON.stringify(payload) })
  },
  async approveDistribution(id: string, payload: { approver?: string; comment?: string }): Promise<DistributionRequest> {
    return request<DistributionRequest>(`/distributions/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async rejectDistribution(id: string, payload: { approver?: string; reason: string }): Promise<DistributionRequest> {
    return request<DistributionRequest>(`/distributions/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async resubmitDistribution(id: string, comment?: string): Promise<DistributionRequest> {
    return request<DistributionRequest>(`/distributions/${encodeURIComponent(id)}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  },
  async shipDistribution(id: string, payload?: { approver?: string; comment?: string }): Promise<{ distribution: DistributionRequest; lot: InventoryLot }> {
    return request<{ distribution: DistributionRequest; lot: InventoryLot }>(`/distributions/${encodeURIComponent(id)}/ship`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    })
  },

  async listRooms(): Promise<RoomWithOccupancy[]> {
    return request<RoomWithOccupancy[]>('/rooms')
  },
  async listEnvReadings(roomId: string): Promise<EnvReading[]> {
    return request<EnvReading[]>(`/rooms/${encodeURIComponent(roomId)}/readings`)
  },
  async getRoomLatest(roomId: string): Promise<RoomLatest> {
    return request<RoomLatest>(`/rooms/${encodeURIComponent(roomId)}/latest`)
  },

  async listAlerts(query: { type?: string; level?: string; status?: string } = {}): Promise<Alert[]> {
    return request<Alert[]>(`/alerts${qs(query)}`)
  },
  async getAlertSummary(): Promise<AlertSummary> {
    return request<AlertSummary>('/alerts/summary')
  },
  async handleAlert(id: string, status: string, note?: string): Promise<Alert> {
    return request<Alert>(`/alerts/${encodeURIComponent(id)}/handle`, { method: 'POST', body: JSON.stringify({ status, note }) })
  },

  async listUsers(): Promise<User[]> {
    return request<User[]>('/system/users')
  },
  async listRoles(): Promise<Role[]> {
    return request<Role[]>('/system/roles')
  },
  async listDictionaries(): Promise<Record<string, string[]>> {
    return request<Record<string, string[]>>('/system/dictionaries')
  },
  async listAuditLogs(query: { operator?: string; objectType?: string } = {}): Promise<AuditLog[]> {
    return request<AuditLog[]>(`/system/audit-logs${qs(query)}`)
  },

  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/dashboard/stats')
  },
}
