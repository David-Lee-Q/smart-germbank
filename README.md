# smart-germbank：种质资源库智能管理系统

面向种质资源库（基因库）的智能化管理系统，集成智能识别与智能检索，完成种质材料信息管理、资源溯源与数据统计，实现种质资源数字化、智能化管护。系统覆盖种质登记、库存货位、活力检测、繁育更新、分发共享、环境监测、预警中心、权限审计与数据驾驶舱等核心业务，采用前后端分离架构。

## 功能模块

| # | 模块 | 说明 |
| --- | --- | --- |
| 1 | 数据驾驶舱 | 种质总量、库存、待处理事项、作物分布、活力分布等指标与图表 |
| 2 | 种质资源登记 | 种质信息的登记、编辑、检索、详情与时间线、CSV 导出 |
| 3 | 库存与货位管理 | 批次创建、出入库、移库、盘点、货位唯一性校验 |
| 4 | 活力检测 | 发芽试验/TTC/四唑染色登记，活力率计算并回写批次 |
| 5 | 繁育更新 | 繁育计划、阶段流转看板，入库自动生成新批次 |
| 6 | 分发与共享 | 分发申请、审批、驳回、执行，库存校验与自动扣减 |
| 7 | 检索与统计分析 | 多条件过滤、聚合分析与图表 |
| 8 | 库房环境监测 | 库房列表、历史读数、最新环境与越限判定 |
| 9 | 预警中心 | 库存不足、活力下降等预警的生成、汇总与闭环处理 |
| 10 | 权限与审计 | 用户、角色、数据字典、操作审计日志 |
| 11 | 环境与系统管理 | 库房环境配置与系统基础数据维护 |

## 技术栈

前端：

- React 18 + TypeScript
- Vite 5（构建与开发服务器，`/api` 反向代理至后端）
- MUI 6（@mui/material、@mui/icons-material）
- React Router 6
- Recharts（图表）

后端：

- Node.js + Express 4 + TypeScript
- zod（请求参数校验）
- SQLite（Node 内置 `node:sqlite`，零外部依赖）

测试：

- Vitest 2 + SuperTest 7

## 目录结构

```text
.
├── index.html
├── package.json                # 前端依赖与脚本
├── vite.config.ts              # 开发服务器、allowedHosts、/api 代理
├── tsconfig*.json
├── src/                        # 前端源码
│   ├── App.tsx                 # 路由与页面装配
│   ├── main.tsx
│   ├── theme.ts                # MUI 主题
│   ├── components/             # 布局与通用组件
│   ├── data/                   # API 客户端、类型、字典、分析工具
│   └── pages/                  # 11 个业务页面
└── server/                     # 后端源码
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── src/
    │   ├── app.ts              # Express 应用装配与错误处理
    │   ├── index.ts            # 服务入口（端口 3001）
    │   ├── db.ts               # SQLite 建表
    │   ├── seed.ts             # 种子数据
    │   ├── types.ts
    │   ├── lib/                # calc 领域计算 / mappers / util
    │   └── routes/             # 9 组 REST 路由
    └── tests/                  # 单元与集成测试
```

## 快速开始

### 环境要求

- Node.js 22+（需支持内置 `node:sqlite`）

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
npm --prefix server install
```

### 启动服务

```bash
# 启动后端（端口 3001）
npm --prefix server run dev

# 另开终端启动前端（端口 5173）
npm run dev
```

前端开发服务器已将 `/api` 反向代理至 `http://localhost:3001`，访问 http://localhost:5173 即可使用。

后端首次启动会自动建库并写入种子数据，数据库文件位于 `server/data/germplasm.db`。

### 构建

```bash
# 前端类型检查与生产构建（产物在 dist/）
npm run build

# 后端类型检查与编译（产物在 server/dist/）
npm --prefix server run build
```

## API 概览

基础路径 `/api`，统一错误结构 `{ "error": { "code": "...", "message": "..." } }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/dashboard/stats` | 驾驶舱统计 |
| GET/POST | `/api/accessions` | 种质列表、登记 |
| GET/PUT | `/api/accessions/:id` | 种质详情、修改 |
| GET | `/api/accessions/export` | 种质 CSV 导出 |
| GET | `/api/accessions/:id/lots\|viability\|regenerations\|distributions\|timeline` | 种质关联数据 |
| GET/POST | `/api/inventory` | 批次列表、创建 |
| POST | `/api/inventory/:id/outbound` | 出库 |
| POST | `/api/inventory/:id/move` | 移库 |
| POST | `/api/inventory/:id/stocktake` | 盘点 |
| GET/POST | `/api/viability` | 活力检测列表、登记 |
| GET | `/api/viability/overdue` | 待复检批次 |
| GET/POST | `/api/regenerations` | 繁育列表、创建 |
| GET | `/api/regenerations/board` | 繁育阶段看板 |
| POST | `/api/regenerations/:id/advance` | 推进繁育阶段 |
| GET/POST | `/api/distributions` | 分发列表、申请 |
| POST | `/api/distributions/:id/approve\|reject\|ship` | 审批、驳回、执行 |
| GET | `/api/alerts` `/api/alerts/summary` | 预警列表、汇总 |
| POST | `/api/alerts/:id/handle` | 处理预警 |
| GET | `/api/rooms` `/api/rooms/:id/readings` `/api/rooms/:id/latest` | 库房环境 |
| GET | `/api/system/users\|roles\|dictionaries\|audit-logs` | 系统管理 |

## 核心业务规则

- 活力率 = 各重复发芽数之和 / (重复数 × 每重复取样数)
- 纯活种子 = 库存数量 × 最近活力率
- 批次状态：数量为 0 判定「耗尽」，低于临界量判定「偏低」，否则「正常」
- 货位唯一：非耗尽批次不可占用同一货位（冲突返回 409）
- 出库/分发数量不得超过可用库存（超出返回 409）
- 活力率 < 75% 生成「活力下降」预警；库存低于临界量或耗尽生成「库存不足」预警
- 繁育阶段顺序：计划 → 播种 → 田间管理 → 收获 → 入库 → 已关闭，入库时自动创建新批次
- 分发状态机：待审批 → 已批准 / 已驳回 → 已分发

## 测试

```bash
cd server
npm test
```

后端测试覆盖领域计算、全部 REST 接口、业务状态机与端到端业务闭环，共 88 条用例。详见 `.cosmocode/specs/germplasm-resource-management/test-report.md`。

## 项目文档

- 产品需求文档：`.cosmocode/specs/germplasm-resource-management/requirements.md`
- 技术设计说明：`.cosmocode/specs/germplasm-resource-management/design.md`
- 测试报告：`.cosmocode/specs/germplasm-resource-management/test-report.md`
