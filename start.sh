#!/usr/bin/env bash
#
# start.sh - 启动种质资源库智能管理系统（生产模式）
# 前端服务：5173  后端服务：3001
#
# 退出码：
#   0 - 服务已在运行，或本次启动成功
#   2 - 启动失败
#
# 说明：
#   - 一律使用生产构建产物启动（前端 vite preview、后端 node dist），
#     避免 dev/热重载模式的内存峰值触发 OOM。
#   - 不使用 timeout 包裹服务进程。
#   - nohup 只接收可执行文件路径作为首个参数；环境变量先 export 再 nohup。
#   - 构建前不残留旧进程：端口被占用时先调用 stop.sh 清理。
#   - 前端 Vite 构建会清空 dist 输出目录（emptyOutDir），无需手动删除缓存。

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${ROOT_DIR}/.run"
WEB_PORT=5173
API_PORT=3001

if ! command -v ss >/dev/null 2>&1; then
  echo "[start] 未找到 ss 命令，无法检测端口状态" >&2
  exit 2
fi

mkdir -p "$RUN_DIR"

# 提取监听指定端口的 PID（去重）
pids_on_port() {
  local port="$1"
  ss -ltnp "sport = :${port}" 2>&1 | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u
}

port_listening() {
  [ -n "$(pids_on_port "$1")" ]
}

is_started() {
  port_listening "$WEB_PORT" && port_listening "$API_PORT"
}

fail() {
  echo "[start] $1" >&2
  echo "[start] 启动失败，清理已启动的进程"
  "$ROOT_DIR/stop.sh" || true
  exit 2
}

# 1. 已启动则直接返回 0
if is_started; then
  echo "[start] 服务已启动（前端 ${WEB_PORT} / 后端 ${API_PORT}），无需重复启动"
  exit 0
fi

# 2. 清理残留进程（部分启动），避免端口冲突
if port_listening "$WEB_PORT" || port_listening "$API_PORT"; then
  echo "[start] 检测到残留进程，先执行停止"
  "$ROOT_DIR/stop.sh" || true
fi

# 3. 构建后端（生产模式）
echo "[start] 构建后端..."
export NODE_OPTIONS="--max-old-space-size=1024"
if ! npm --prefix "$ROOT_DIR/server" run build; then
  echo "[start] 后端构建失败" >&2
  exit 2
fi

# 4. 构建前端（生产模式，Vite 构建自动清空 dist）
echo "[start] 构建前端..."
if ! (cd "$ROOT_DIR" && npm run build); then
  echo "[start] 前端构建失败" >&2
  exit 2
fi

# 5. 启动后端
echo "[start] 启动后端（端口 ${API_PORT}）..."
: > "${RUN_DIR}/backend.log"
(
  cd "$ROOT_DIR/server" || exit 1
  export PORT="$API_PORT"
  export NODE_OPTIONS="--max-old-space-size=384"
  nohup node --no-warnings dist/index.js >> "${RUN_DIR}/backend.log" 2>&1 &
  echo $! > "${RUN_DIR}/backend.pid"
)

# 6. 启动前端
echo "[start] 启动前端（端口 ${WEB_PORT}）..."
: > "${RUN_DIR}/frontend.log"
(
  cd "$ROOT_DIR" || exit 1
  export NODE_OPTIONS="--max-old-space-size=384"
  nohup ./node_modules/.bin/vite preview --host 0.0.0.0 --port "$WEB_PORT" --strictPort >> "${RUN_DIR}/frontend.log" 2>&1 &
  echo $! > "${RUN_DIR}/frontend.pid"
)

# 7. 等待端口就绪
wait_port() {
  local port="$1"
  local name="$2"
  local i=0
  while [ "$i" -lt 60 ]; do
    if port_listening "$port"; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "[start] ${name}（端口 ${port}）等待就绪超时" >&2
  return 1
}

wait_port "$API_PORT" "后端" || fail "后端启动失败"
wait_port "$WEB_PORT" "前端" || fail "前端启动失败"

# 8. 校验 web 页面可访问（端口根路径返回首页）
HTML="$(curl -fsS "http://127.0.0.1:${WEB_PORT}/" 2>&1)"
if ! echo "$HTML" | grep -q 'id="root"'; then
  fail "前端首页校验失败（未返回预期 HTML）"
fi

# 9. 校验后端接口通过前端反向代理可达
API="$(curl -fsS "http://127.0.0.1:${WEB_PORT}/api/health" 2>&1)"
if ! echo "$API" | grep -q '"status":"ok"'; then
  fail "后端接口经反向代理校验失败"
fi

echo "[start] 启动成功：前端 http://0.0.0.0:${WEB_PORT} / 后端 http://0.0.0.0:${API_PORT}（页面访问走前端 /api 代理）"
exit 0
