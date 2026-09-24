import type { DB } from './db.js'

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CROPS = ['水稻', '小麦', '玉米', '大豆', '马铃薯', '甘薯', '高粱', '谷子', '棉花', '油菜', '花生', '大麦']
const CROP_META: Record<string, { sci: string; family: string; genus: string }> = {
  水稻: { sci: 'Oryza sativa L.', family: '禾本科', genus: '稻属' },
  小麦: { sci: 'Triticum aestivum L.', family: '禾本科', genus: '小麦属' },
  玉米: { sci: 'Zea mays L.', family: '禾本科', genus: '玉蜀黍属' },
  大豆: { sci: 'Glycine max (L.) Merr.', family: '豆科', genus: '大豆属' },
  马铃薯: { sci: 'Solanum tuberosum L.', family: '茄科', genus: '茄属' },
  甘薯: { sci: 'Ipomoea batatas (L.) Lam.', family: '旋花科', genus: '番薯属' },
  高粱: { sci: 'Sorghum bicolor (L.) Moench', family: '禾本科', genus: '高粱属' },
  谷子: { sci: 'Setaria italica (L.) Beauv.', family: '禾本科', genus: '狗尾草属' },
  棉花: { sci: 'Gossypium hirsutum L.', family: '锦葵科', genus: '棉属' },
  油菜: { sci: 'Brassica napus L.', family: '十字花科', genus: '芸薹属' },
  花生: { sci: 'Arachis hypogaea L.', family: '豆科', genus: '落花生属' },
  大麦: { sci: 'Hordeum vulgare L.', family: '禾本科', genus: '大麦属' },
}
const REGIONS: [string, string, number, number][] = [
  ['中国', '云南省', 24.88, 102.83],
  ['中国', '黑龙江省', 45.75, 126.66],
  ['中国', '四川省', 30.66, 104.06],
  ['中国', '广东省', 23.13, 113.26],
  ['中国', '新疆维吾尔自治区', 43.83, 87.62],
  ['中国', '江苏省', 32.06, 118.79],
  ['中国', '海南省', 20.02, 110.35],
  ['中国', '河南省', 34.76, 113.65],
  ['印度', '旁遮普邦', 31.15, 75.85],
  ['泰国', '清迈府', 18.79, 98.99],
  ['日本', '北海道', 43.06, 141.35],
  ['巴西', '马托格罗索州', -12.64, -55.42],
]
const SOURCE_TYPES = ['野外采集', '国内交换', '国外引进', '育种选育', '农家品种']
const STORAGE_TYPES = ['长期库', '中期库', '短期库', '复份库', '离体库']
const COLLECTORS = ['张伟', '李静', '王强', '刘洋', '陈晨', '赵敏', '孙磊', '周婷']
const TESTERS = ['吴迪', '郑爽', '冯磊', '许晴']
const OWNERS = ['钱进', '马丽', '朱峰', '胡兵']
const ORGS = ['中国农业科学院', '某省农业科学院', '某农业大学', '某种业股份有限公司', '国家种质资源库']

export function seed(db: DB): void {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM accessions').get() as { c: number }).c
  if (count > 0) return

  const rnd = mulberry32(20260923)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
  const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min
  const round = (n: number, d = 1) => Number(n.toFixed(d))
  const dateStr = (y0: number, y1: number) => {
    const y = int(y0, y1)
    const m = int(1, 12)
    const d = int(1, 28)
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const insAcc = db.prepare(
    `INSERT INTO accessions (id,name,scientific_name,family,genus,crop,source_type,country,region,latitude,longitude,altitude,collector,collected_at,storage_type,status,introduced_at,description)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
  const insLot = db.prepare(
    `INSERT INTO lots (id,accession_id,storage_type,room,cabinet,layer,position,quantity,unit,thousand_grain_weight,moisture,stored_at,viability_rate,pure_live_seed,critical_amount,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
  const insTest = db.prepare(
    `INSERT INTO viability_tests (id,lot_id,accession_id,method,replicates,seeds_per_replicate,germinated,viability_rate,tested_at,tester)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
  const insRegen = db.prepare(
    `INSERT INTO regenerations (id,accession_id,reason,planned_quantity,plot,stage,owner,sowing_date,expected_harvest,actual_harvest)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
  const insDist = db.prepare(
    `INSERT INTO distributions (id,accession_id,lot_id,applicant,organization,quantity,purpose,status,applied_at,review_comment)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
  const insRoom = db.prepare(
    `INSERT INTO storage_rooms (id,name,storage_type,temp_min,temp_max,humidity_max,online) VALUES (?,?,?,?,?,?,?)`,
  )
  const insEnv = db.prepare(
    `INSERT INTO env_readings (room_id,room_name,temperature,humidity,recorded_at) VALUES (?,?,?,?,?)`,
  )
  const insAlert = db.prepare(
    `INSERT INTO alerts (id,type,level,target,target_id,description,status,created_at) VALUES (?,?,?,?,?,?,?,?)`,
  )
  const insUser = db.prepare(`INSERT INTO users (id,account,name,roles,status,last_login) VALUES (?,?,?,?,?,?)`)
  const insRole = db.prepare(`INSERT INTO roles (id,name,description,permissions) VALUES (?,?,?,?)`)
  const insLog = db.prepare(
    `INSERT INTO audit_logs (id,operator,action,object_type,object_id,created_at,ip) VALUES (?,?,?,?,?,?,?)`,
  )

  db.exec('BEGIN')
  try {
    const lotIds: { id: string; accessionId: string; quantity: number; criticalAmount: number; viabilityRate: number; status: string; room: string }[] = []

    for (let i = 0; i < 68; i++) {
      const crop = pick(CROPS)
      const meta = CROP_META[crop]
      const region = pick(REGIONS)
      const aStatus = rnd() < 0.82 ? '正常' : rnd() < 0.6 ? '待鉴定' : '暂停分发'
      const id = `GZ-${String(2020000 + i).padStart(8, '0')}`
      insAcc.run(
        id,
        `${crop}地方品种-${String(i + 1).padStart(3, '0')}`,
        meta.sci,
        meta.family,
        meta.genus,
        crop,
        pick(SOURCE_TYPES),
        region[0],
        region[1],
        round(region[2] + (rnd() - 0.5), 3),
        round(region[3] + (rnd() - 0.5), 3),
        int(15, 2400),
        pick(COLLECTORS),
        dateStr(2015, 2025),
        pick(STORAGE_TYPES),
        aStatus,
        dateStr(2016, 2025),
        `${crop}种质资源，采集于${region[1]}，具有${pick(['抗旱', '耐盐碱', '高产', '抗病', '优质', '早熟'])}特性。`,
      )

      const lotCount = int(1, 3)
      for (let j = 0; j < lotCount; j++) {
        const storageType = pick(STORAGE_TYPES)
        const viabilityRate = round(0.55 + rnd() * 0.44, 2)
        const quantity = rnd() < 0.08 ? 0 : int(20, 4800)
        const criticalAmount = pick([100, 150, 200, 300, 500])
        const pureLiveSeed = Math.round(quantity * viabilityRate)
        const lotStatus = quantity === 0 ? '耗尽' : quantity < criticalAmount ? '偏低' : rnd() < 0.05 ? '封存' : '正常'
        const lotId = `LOT-${String(2021000 + i * 3 + j).padStart(8, '0')}`
        insLot.run(
          lotId,
          id,
          storageType,
          `${storageType}-${String.fromCharCode(65 + int(0, 2))}库`,
          `柜${String(int(1, 24)).padStart(2, '0')}`,
          `第${int(1, 6)}层`,
          `位${String(int(1, 30)).padStart(2, '0')}`,
          quantity,
          '粒',
          round(2 + rnd() * 45, 1),
          round(4 + rnd() * 6, 1),
          dateStr(2018, 2025),
          viabilityRate,
          pureLiveSeed,
          criticalAmount,
          lotStatus,
        )
        lotIds.push({ id: lotId, accessionId: id, quantity, criticalAmount, viabilityRate, status: lotStatus, room: `${storageType}-A库` })
      }
    }

    let testIdx = 0
    for (const lot of lotIds) {
      if (rnd() < 0.2) continue
      const replicates = int(2, 4)
      const seedsPerReplicate = pick([50, 100])
      const total = replicates * seedsPerReplicate
      const germinated = Math.round(total * lot.viabilityRate)
      insTest.run(
        `VT-${String(3000000 + testIdx++).padStart(8, '0')}`,
        lot.id,
        lot.accessionId,
        rnd() < 0.8 ? '发芽试验' : 'TTC染色',
        replicates,
        seedsPerReplicate,
        germinated,
        round(germinated / total, 2),
        dateStr(2022, 2025),
        pick(TESTERS),
      )
    }

    const accIds = (db.prepare('SELECT id FROM accessions').all() as { id: string }[]).map((r) => r.id)
    const STAGES = ['计划', '播种', '田间管理', '收获', '入库', '已关闭']
    for (let i = 0; i < 26; i++) {
      const stage = pick(STAGES)
      insRegen.run(
        `RG-${String(4000000 + i).padStart(8, '0')}`,
        pick(accIds),
        pick(['库存低于临界量', '活力下降需复壮', '定期更新', '遗传完整性维持']),
        pick([500, 1000, 2000, 3000]),
        `试验田-${int(1, 8)}号`,
        stage,
        pick(OWNERS),
        dateStr(2023, 2025),
        dateStr(2025, 2026),
        stage === '入库' || stage === '已关闭' ? int(400, 3500) : null,
      )
    }

    for (let i = 0; i < 34; i++) {
      const lot = pick(lotIds)
      const status = pick(['待审批', '已批准', '已驳回', '已分发'])
      insDist.run(
        `DR-${String(5000000 + i).padStart(8, '0')}`,
        lot.accessionId,
        lot.id,
        pick(['孙研究员', '李教授', '王工程师', '刘博士', '陈老师']),
        pick(ORGS),
        int(10, 200),
        pick(['育种亲本', '基础研究', '品种比较试验', '教学示范', '遗传多样性分析']),
        status,
        dateStr(2024, 2025),
        status === '已驳回' ? '用途说明不充分，请补充后重新提交' : null,
      )
    }

    const rooms: [string, string, string, number, number, number, number][] = [
      ['R1', '长期库-A库', '长期库', -22, -18, 50, 1],
      ['R2', '中期库-A库', '中期库', -6, -2, 50, 1],
      ['R3', '短期库-B库', '短期库', 0, 10, 65, 1],
      ['R4', '复份库-A库', '复份库', -22, -18, 50, 0],
      ['R5', '离体库-A库', '离体库', 4, 35, 80, 1],
    ]
    for (const r of rooms) {
      insRoom.run(...r)
      for (let h = 23; h >= 0; h--) {
        const base = (r[3] + r[4]) / 2
        const temp = round(base + (rnd() - 0.5) * 3, 1)
        const humidity = round(40 + rnd() * 20, 0)
        insEnv.run(r[0], r[1], temp, humidity, `${String((24 - h) % 24).padStart(2, '0')}:00`)
      }
    }

    const lowLots = lotIds.filter((l) => l.status === '偏低' || l.status === '耗尽').slice(0, 22)
    let alertIdx = 0
    for (const lot of lowLots) {
      const type = lot.status === '耗尽' ? '库存不足' : pick(['库存不足', '活力下降'])
      insAlert.run(
        `AL-${String(6000000 + alertIdx++).padStart(8, '0')}`,
        type,
        lot.status === '耗尽' ? '严重' : pick(['严重', '警告', '提示']),
        lot.accessionId,
        lot.id,
        `批次 ${lot.id} ${type}：当前数量 ${lot.quantity}粒，活力率 ${(lot.viabilityRate * 100).toFixed(0)}%。`,
        pick(['未处理', '处理中', '已闭环']),
        dateStr(2025, 2026),
      )
    }
    for (let i = 0; i < 10; i++) {
      const room = pick(rooms)
      const type = pick(['环境异常', '存储超期', '设备离线'])
      insAlert.run(
        `AL-${String(6000000 + alertIdx++).padStart(8, '0')}`,
        type,
        pick(['严重', '警告', '提示']),
        room[1],
        room[0],
        type === '环境异常'
          ? `${room[1]} 温度超出设定范围 ${room[3]}~${room[4]}℃。`
          : type === '设备离线'
            ? `${room[1]} 数据采集设备超过 2 小时未上报。`
            : `${room[1]} 存在入库超过保存年限的批次。`,
        pick(['未处理', '处理中', '已闭环']),
        dateStr(2025, 2026),
      )
    }

    const users: [string, string, string, string[], string, string][] = [
      ['U1', 'admin', '系统管理员', ['系统管理员'], '启用', '2026-09-23 09:12'],
      ['U2', 'curator01', '张伟', ['库管员'], '启用', '2026-09-22 17:40'],
      ['U3', 'researcher01', '李静', ['研究人员'], '启用', '2026-09-23 08:55'],
      ['U4', 'manager01', '王强', ['库负责人', '研究人员'], '启用', '2026-09-21 14:20'],
      ['U5', 'guest01', '访客用户', ['访客'], '停用', '2026-08-30 10:05'],
    ]
    for (const u of users) insUser.run(u[0], u[1], u[2], JSON.stringify(u[3]), u[4], u[5])

    const roles: [string, string, string, string[]][] = [
      ['ROLE-ADMIN', '系统管理员', '维护用户、角色、字典与审计', ['*']],
      ['ROLE-CURATOR', '库管员', '种质登记、出入库、货位与盘点', ['accession:write', 'inventory:write', 'scan:use']],
      ['ROLE-RESEARCHER', '研究人员', '检索、活力检测、繁育、分发申请', ['accession:read', 'viability:write', 'regeneration:write', 'distribution:apply']],
      ['ROLE-MANAGER', '库负责人', '审批与统计查看', ['distribution:approve', 'analytics:read', 'alert:handle']],
      ['ROLE-GUEST', '访客', '公开信息只读', ['accession:read:public']],
    ]
    for (const r of roles) insRole.run(r[0], r[1], r[2], JSON.stringify(r[3]))

    const actions: [string, string][] = [
      ['新增种质', 'Accession'],
      ['修改种质', 'Accession'],
      ['创建库存批次', 'InventoryLot'],
      ['执行出库', 'InventoryLot'],
      ['登记活力检测', 'ViabilityTest'],
      ['审批分发申请', 'DistributionRequest'],
      ['执行分发', 'DistributionRequest'],
      ['移库', 'InventoryLot'],
    ]
    for (let i = 0; i < 40; i++) {
      const [action, objectType] = pick(actions)
      insLog.run(
        `LOG-${String(7000000 + i).padStart(8, '0')}`,
        pick(users)[2],
        action,
        objectType,
        pick(accIds),
        `${dateStr(2025, 2026)} ${String(int(8, 19)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`,
        `10.20.${int(0, 12)}.${int(2, 254)}`,
      )
    }

    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}
