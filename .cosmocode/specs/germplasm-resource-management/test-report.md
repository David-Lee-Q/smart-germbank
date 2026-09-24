# 种质资源库智能管理系统 测试报告

- 项目：种质资源库智能管理系统（germplasm-resource-management）
- 测试日期：2026-09-23
- 被测版本：前端 `germplasm-resource-management@0.1.0` / 后端 `germplasm-server@0.1.0`
- 测试类型：单元测试 + 接口集成测试 + 前后端联调验证

## 1. 测试目标

验证系统后端领域计算逻辑的正确性、REST 接口的行为契约与边界处理，以及“登记—入库—活力检测—繁育更新—分发”完整业务闭环的可用性，确保前端可通过反向代理正常访问真实后端数据。

## 2. 测试环境

| 项目 | 内容 |
| --- | --- |
| 运行环境 | Node.js v22.22.0 |
| 后端 | Express 4 + TypeScript + zustand/zod + node:sqlite（内置） |
| 前端 | React 18 + Vite 5 + MUI 6 + TypeScript |
| 测试框架 | Vitest 2.1 + SuperTest 7 |
| 数据隔离 | 每个测试套件使用独立的内存数据库（`createDb(':memory:')`）并写入种子数据 |
| 服务端口 | 后端 3001，前端 5173（`/api` 代理至 3001） |

## 3. 测试策略

1. 单元测试：直接调用领域函数，覆盖正常值、边界值与非法输入。
2. 集成测试：通过 SuperTest 驱动完整 Express 应用，验证 HTTP 状态码、响应结构与数据库副作用。
3. 端到端流程测试：在一个连续场景中串联全部核心模块，验证跨模块数据一致性。
4. 联调验证：启动前后端服务，通过 Vite 代理请求真实接口。

## 4. 用例分布与执行结果

| 测试文件 | 覆盖内容 | 用例数 | 结果 |
| --- | --- | --- | --- |
| `tests/calc.test.ts` | 活力率、纯活种子、库存状态、活力分级 | 19 | 通过 |
| `tests/accessions.test.ts` | 种质列表/过滤/检索/详情/登记/修改/导出 | 11 | 通过 |
| `tests/inventory.test.ts` | 批次创建、出入库、移库、盘点、货位与预警 | 10 | 通过 |
| `tests/viability.test.ts` | 活力检测登记与回写、非法参数、待复检 | 7 | 通过 |
| `tests/regeneration.test.ts` | 繁育计划创建、阶段流转、入库生成新批次、看板 | 6 | 通过 |
| `tests/distribution.test.ts` | 分发申请、审批/驳回/执行、库存校验与预警 | 12 | 通过 |
| `tests/alerts.test.ts` | 预警列表/过滤、汇总统计、闭环处理 | 7 | 通过 |
| `tests/environment.test.ts` | 库房列表、历史读数、最新环境与异常判定 | 5 | 通过 |
| `tests/system.test.ts` | 用户、角色、字典、审计日志与过滤 | 5 | 通过 |
| `tests/dashboard.test.ts` | 驾驶舱统计指标与图表数据一致性 | 3 | 通过 |
| `tests/integration.test.ts` | 端到端业务闭环与接口健壮性 | 3 | 通过 |
| 合计 |  | **88** | **88 通过 / 0 失败** |

执行命令与结果：

```bash
cd /workspace/server
npm test
# Test Files  11 passed (11)
#      Tests  88 passed (88)
```

## 5. 关键业务规则验证

| 规则 | 验证结论 |
| --- | --- |
| 活力率 = Σ发芽数 / (重复数 × 每重复取样数) | 通过（含取整到两位小数） |
| 纯活种子 = 库存数量 × 最近活力率 | 通过（出库、盘点、检测、分发后均正确回写） |
| 批次状态：0=耗尽、<临界量=偏低、≥临界量=正常 | 通过 |
| 货位唯一性（非耗尽批次不可占用同一货位） | 通过（返回 409 `LOCATION_OCCUPIED`） |
| 出库/分发数量不得超过可用库存 | 通过（返回 409 `INSUFFICIENT_STOCK`） |
| 活力率 < 75% 生成“活力下降”预警 | 通过 |
| 库存低于临界量或耗尽生成“库存不足”预警 | 通过 |
| 分发状态机：待审批 → 已批准/已驳回 → 已分发 | 通过（非法流转返回 409 `INVALID_STATE`） |
| 繁育阶段顺序：计划→播种→田间管理→收获→入库→已关闭 | 通过（入库自动生成新批次） |
| 种质不可分发状态拦截（暂停分发/已注销） | 通过（返回 409 `NOT_DISTRIBUTABLE`） |
| 关键操作写入审计日志 | 通过（新增种质、创建批次、检测、繁育、分发等） |
| 统一错误结构 `{ error: { code, message } }` | 通过（400/404/409） |

## 6. 前后端联调验证

| 检查项 | 结果 |
| --- | --- |
| 后端健康检查 `GET /api/health` | `200 {"status":"ok"}` |
| 前端首页 `GET http://localhost:5173/` | `200` |
| Vite 代理 `GET http://localhost:5173/api/dashboard/stats` | 返回真实统计数据（68 份种质、138 个批次） |
| 前端生产构建 `npm run build` | 通过（`tsc -b && vite build`） |
| 后端类型检查 `tsc --noEmit` | 通过 |

## 7. 缺陷记录与修复

| 编号 | 现象 | 原因 | 处理 |
| --- | --- | --- | --- |
| BUG-001 | Vitest 加载失败：`Failed to load url sqlite` | Vite 未将 `node:sqlite` 识别为内建模块，剥离 `node:` 前缀后解析失败 | 新增 `tests/sqlite-shim.ts` 通过 `createRequire` 转发，并在 `vitest.config.ts` 中配置别名，测试恢复 |
| BUG-002 | `system` 用例断言失败：用户对象缺少 `username` | 后端返回字段为 `account`/`name`，测试用例字段名有误 | 修正测试断言为 `account`/`roles` / 无 `password` |

## 8. 遗留问题与建议

1. SQLite 为 Node 实验特性，运行时有 `ExperimentalWarning`；生产环境建议评估切换至稳定驱动或启用生产构建。
2. 前端生产包单个 chunk 约 986KB，建议按路由做代码分割（`manualChunks` / 动态导入）。
3. 分发审批与状态流转暂未包含并发控制，高并发下建议补充事务或乐观锁。
4. 可补充前端组件层测试（Vitest + Testing Library）与关键页面的 UI 回归用例。

## 9. 结论

后端 88 条测试用例全部通过，覆盖领域计算、全部 REST 资源、业务状态机与端到端闭环；前后端联调与生产构建均验证成功。系统核心功能达到可用状态。
