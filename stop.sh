#!/usr/bin/env bash
#
# stop.sh - 停止种质资源库智能管理系统
# 前端服务：5173  后端服务：3001
#
# 退出码：统一返回 0（幂等）。仅当缺少 ss 命令时返回 1。
#
# 说明：
#   - 使用 ss 提取端口对应的 PID，不使用 fuser/lsof。
#   - 不使用 2>/dev/null，避免吞掉 “command not found” 而误判为已停止。

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${ROOT_DIR}/.run"
WEB_PORT=5173
API_PORT=3001

if ! command -v ss >/dev/null 2>&1; then
  echo "[stop] 未找到 ss 命令，无法按端口停止服务" >&2
  exit 1
fi

# 提取监听指定端口的 PID（去重）
pids_on_port() {
  local port="$1"
  ss -ltnp "sport = :${port}" 2>&1 | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u
}

# 停止单个端口上的服务
stop_port() {
  local port="$1"
  local name="$2"
  local pids i

  pids="$(pids_on_port "$port")"
  if [ -z "$pids" ]; then
    echo "[stop] ${name}（端口 ${port}）未在运行"
    return 0
  fi

  echo "[stop] 停止 ${name}（端口 ${port}），PID: $(echo "$pids" | tr '\n' ' ')"
  # shellcheck disable=SC2086
  kill -TERM $pids 2>&1 || true

  i=0
  while [ "$i" -lt 15 ]; do
    sleep 1
    pids="$(pids_on_port "$port")"
    if [ -z "$pids" ]; then
      echo "[stop] ${name} 已停止"
      return 0
    fi
    i=$((i + 1))
  done

  echo "[stop] ${name} 未在 15s 内退出，强制结束，PID: $(echo "$pids" | tr '\n' ' ')"
  # shellcheck disable=SC2086
  kill -KILL $pids 2>&1 || true
  sleep 1

  pids="$(pids_on_port "$port")"
  if [ -n "$pids" ]; then
    echo "[stop] 警告：${name}（端口 ${port}）仍被占用，PID: $(echo "$pids" | tr '\n' ' ')" >&2
    return 0
  fi
  echo "[stop] ${name} 已停止"
  return 0
}

stop_port "$WEB_PORT" "前端"
stop_port "$API_PORT" "后端"

# 清理 pid 记录（截断，不删除文件）
if [ -d "$RUN_DIR" ]; then
  : > "${RUN_DIR}/frontend.pid" 2>&1 || true
  : > "${RUN_DIR}/backend.pid" 2>&1 || true
fi

echo "[stop] 完成"
exit 0
