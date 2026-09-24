# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [运维部署|构建方法|测试方法|排错调试|工作流协作|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[项目技术栈与构建方式]
- Date: 2026-09-23
- Context: Agent 在搭建种质资源库智能管理系统原型时发现
- Category: 构建方法
- Instructions:
  - 项目为前端单页应用，路径为仓库根目录，技术栈 React 18 + Vite 5 + MUI 6 + React Router 6 + Recharts + TypeScript
  - 安装依赖：`npm install`
  - 类型检查与生产构建：`npm run build`（执行 `tsc -b && vite build`，产物在 `dist/`）
  - 本地开发服务器：`npm run dev`，默认端口 5173，`vite.config.ts` 已配置 `host: '0.0.0.0'`、`allowedHosts` 与 `/api` 反向代理到 `http://localhost:3001`
  - 前端通过 `src/data/api.ts` 调用真实后端；注意根目录 `npm run dev` 实际会启动后端脚本，后端须用 `npm --prefix /workspace/server run dev`

[后端服务与测试方法]
- Date: 2026-09-23
- Context: Agent 在实现后端与编写测试时发现
- Category: 测试方法
- Instructions:
  - 后端位于 `/workspace/server`，技术栈 Express + TypeScript + node:sqlite（内置），端口 3001，健康检查 `GET /api/health`
  - 后端启动：`npm --prefix /workspace/server run dev`；构建：`npm --prefix /workspace/server run build`
  - 测试：`cd /workspace/server && npm test`（Vitest + SuperTest），用例位于 `server/tests/`
  - 关键排错：Vitest 无法解析内置 `node:sqlite`（报 `Failed to load url sqlite`），已通过 `server/tests/sqlite-shim.ts` + `vitest.config.ts` 别名解决，勿删除
  - 测试使用内存数据库并写入种子数据，用例间相互隔离

[产品需求文档位置]
- Date: 2026-09-23
- Context: Agent 编写 PRD 时发现
- Category: 工作流协作
- Instructions:
  - PRD 与技术设计文档位于 `.cosmocode/specs/{FEATURE_NAME}/`，本系统为 `.cosmocode/specs/germplasm-resource-management/`
