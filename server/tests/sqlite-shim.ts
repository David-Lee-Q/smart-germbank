// vitest 运行环境将 node:sqlite 误判为非内建模块，这里通过 createRequire 绕过 Vite 的模块解析。
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sqlite = require('node:sqlite') as typeof import('node:sqlite')

export const DatabaseSync = sqlite.DatabaseSync
export type DatabaseSync = import('node:sqlite').DatabaseSync
export default sqlite
