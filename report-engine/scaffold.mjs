#!/usr/bin/env node
/**
 * 리포트 엔진 · 스캐폴드 (새 리포트를 표준 템플릿에서 생성)
 * ------------------------------------------------------------------
 * 표준(섹션 순서·지표 정의·컴포넌트·게이트)이 이미 적용된 상태로 시작한다.
 * 만든 뒤: __…__ 자리표시자만 그 사람 데이터·코치 해석으로 채우고 publish.
 *
 * 사용: node scaffold.mjs <name> <email> <start> <end> ["이름 님"] ["N차 리포트"]
 *   예: node scaffold.mjs yuna-1 yoonina0502@naver.com 2026-08-11 2026-09-07 "윤이나 님" "1차 리포트"
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [name, email, start, end, who = "__이름 님__", title = "__N차 리포트__"] = process.argv.slice(2);
if (!name || !email || !start || !end) {
  console.error('사용: node scaffold.mjs <name> <email> <start(YYYY-MM-DD)> <end> ["이름 님"] ["N차 리포트"]');
  process.exit(2);
}
const ENGINE = dirname(fileURLToPath(import.meta.url));
const TPL = join(ENGINE, "template");
const DIR = join(ENGINE, "reports", name);
if (existsSync(DIR)) { console.error(`이미 존재: reports/${name}`); process.exit(2); }
mkdirSync(DIR, { recursive: true });

const sub = (s) => s
  .replaceAll("__EMAIL__", email).replaceAll("__START__", start).replaceAll("__END__", end)
  .replaceAll("__이름 님__", who).replaceAll("__N차 리포트__", title);

for (const f of ["config.json", "narrative.json", "redesign.json"]) {
  writeFileSync(join(DIR, f), sub(readFileSync(join(TPL, f), "utf8")));
}
console.log(`✅ reports/${name}/ 생성 (표준 템플릿 적용)\n`);
console.log("다음 단계:");
console.log(`  1) 데이터 뽑기:  DBURL=<Neon> node report-engine/extract.mjs report-engine/reports/${name}/config.json`);
console.log(`     - 여행/시차 있으면 config.json의 segments를 구간별로, usSegment/routineFrom 설정`);
console.log(`     - cpap 등 해석성 필드는 overlay.json(사람이 메모 읽은 검증값)로`);
console.log(`  2) 자리표시자(__…__) 채우기:  narrative.json(해석)·redesign.json(요약/지표/요인/코치노트/목표)`);
console.log(`     - 숫자는 스냅샷 실측만, 인용은 세션/일지 근거 (지어내기 금지)`);
console.log(`     - compare: 직전 기간을 같은 방식으로 재계산해 prev 값 채우기`);
console.log(`     - claims.json 작성(감사·인용검증용)`);
console.log(`  3) 발행 게이트:  bash report-engine/publish.sh report-engine/reports/${name}/config.json`);
console.log(`     (render → 톤·디자인 lint → 데이터 audit → 인용 verify, 셋 다 FAIL 0이어야 발행)`);
