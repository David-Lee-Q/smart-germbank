export interface VersionEntry {
  version: string
  date: string
  items: string[]
}

export const APP_VERSION = '0.3.0'

export const GITHUB_URL = 'https://github.com/David-Lee-Q/smart-germbank'

export const CHANGELOG: VersionEntry[] = [
  {
    version: '0.3.0',
    date: '2026-09-28',
    items: [
      '分发共享新增全节点审批记录，覆盖库管员初审、库负责人审批、分发执行',
      '支持驳回并填写原因，驳回后可重新提交并保留历史审批轮次',
      '分发列表展示审批进度，详情按轮次展示完整审批记录',
      '登录注册页视觉与交互优化，背景改为随机植物图并统一蒙版',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-20',
    items: [
      '新增登录、注册与角色权限，区分系统管理员、库管员与研究人员',
      '新增预警中心，活力率低于阈值自动提醒',
      '新增统计分析看板与环境监测',
      '库存批次支持货位管理与盘点台账',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-01',
    items: [
      '种质资源登记、检索与详情管理',
      '库存出入库与批次生命周期管理',
      '活力检测与纯活种子计算',
      '繁育与分发基础流程',
    ],
  },
]
