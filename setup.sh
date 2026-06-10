#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-"$ROOT_DIR/lab5/apps/server/.env"}"

# 默认读取服务端环境变量，使应用连接配置与数据库初始化保持一致。
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "未找到环境变量文件：$ENV_FILE"
  echo "将使用默认数据库配置，也可以先复制 lab5/apps/server/.env.example 为 .env 后再运行。"
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-dbh_pj_lab5}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD-}"
MAINTENANCE_DB="${MAINTENANCE_DB:-postgres}"
SKIP_DATA="${SKIP_DATA:-0}"

if ! command -v psql >/dev/null 2>&1; then
  echo "未找到 psql，请先安装 PostgreSQL 客户端。"
  exit 1
fi

if ! command -v createdb >/dev/null 2>&1; then
  echo "未找到 createdb，请先安装 PostgreSQL 客户端。"
  exit 1
fi

if [[ -n "$DB_PASSWORD" ]]; then
  export PGPASSWORD="$DB_PASSWORD"
else
  unset PGPASSWORD || true
fi

psql_base=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER")

run_sql() {
  local file="$1"
  local label="$2"

  if [[ ! -f "$file" ]]; then
    echo "跳过 $label：文件不存在 $file"
    return
  fi

  echo "导入 $label：$file"
  psql "${psql_base[@]}" -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$file"
}

echo "数据库配置：$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

if psql "${psql_base[@]}" -d "$MAINTENANCE_DB" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -qx "1"; then
  echo "数据库已存在：$DB_NAME"
else
  echo "创建数据库：$DB_NAME"
  createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
fi

run_sql "$ROOT_DIR/lab4/lab4_schema_seed.sql" "Lab4 基础 schema"
run_sql "$ROOT_DIR/lab5/scripts/allow-unbound-sysuser.sql" "Lab5 账号注册兼容变更"
run_sql "$ROOT_DIR/lab5/scripts/add-chat-session-tables.sql" "Lab5 对话会话表"

if [[ "$SKIP_DATA" == "1" ]]; then
  echo "已设置 SKIP_DATA=1，跳过演示数据导入。"
else
  run_sql "$ROOT_DIR/lab5/data/fudan-campus/fudan-campus-events.sql" "复旦校区与活动演示数据"
  run_sql "$ROOT_DIR/lab5/data/fudan-syllabus/fudan-course-upsert.sql" "复旦课程大纲演示数据"
fi

echo "数据库初始化完成。"
