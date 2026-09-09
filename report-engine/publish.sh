#!/usr/bin/env bash
# 리포트 엔진 · 발행 게이트 (render → 톤/디자인 린트 → 데이터 감사)
# 하나라도 실패하면 중단. 통과해야 report.html 발행 가능.
# 사용: bash publish.sh reports/<name>/config.json
#   (데이터 새로 뽑을 땐 먼저: DBURL=... node extract.mjs reports/<name>/config.json)
set -euo pipefail
CFG="${1:?사용: bash publish.sh reports/<name>/config.json}"
DIR="$(dirname "$CFG")"
ENGINE="$(cd "$(dirname "$0")" && pwd)"
# 세션 인용 검증용 Neon URL (없으면 .env.local에서)
DBURL="${DBURL:-$(grep -E '^DATABASE_URL' "$ENGINE/../.env.local" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')}"
export DBURL

echo "▶ 1/4 render"
python3 "$ENGINE/render.py" "$CFG" | sed 's/^/   /'

echo "▶ 2/4 톤·디자인 린트"
node "$ENGINE/lint.mjs" "$DIR/report.html"

echo "▶ 3/4 데이터 감사(숫자)"
node "$ENGINE/../report-audit/audit-report.mjs" "$DIR/snapshot.json" "$DIR/claims.json"

echo "▶ 4/4 인용 검증(세션·메모·필드)"
node "$ENGINE/verify-citations.mjs" "$CFG" "$DIR/snapshot.json" "$DIR/claims.json"

echo "✅ 발행 게이트 통과 — $DIR/report.html"
