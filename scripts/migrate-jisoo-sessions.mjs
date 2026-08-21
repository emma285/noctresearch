#!/usr/bin/env node
// 이지수님 코칭 세션 히스토리(Notion 페이지 토글 15개) → Neon sessions.
// - 회차 1~15 (2/9 ~ 8/10). 녹음 있는 회차(1·2·3·11·14·15)는 별도 오디오 파이프라인(Step B).
// - Notion 세션 기록 텍스트 → detail.memo(코치 내부). published=false(코치 검토 후 공개).
// - 기존 잘못 라벨된 세션(현재 n=1, 실제 8/10 내용, 오디오노트 보유) → n=15로 정정 + 노션노트 병합.
// 재실행 안전: (client_id, n) 기준 upsert.
//
// 실행:  node scripts/migrate-jisoo-sessions.mjs           (dry-run)
//        node scripts/migrate-jisoo-sessions.mjs --commit
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f); if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const COMMIT = process.argv.includes("--commit");
const CLIENT_ID = "3b9565bc-0343-8135-a17c-ce80de18f10c";      // 이지수
const EXISTING_S15_ID = "3b9565bc-0343-81a5-9584-d05dddc6d54b"; // 현재 n=1(잘못) = 실제 8/10 = n=15

// rec: 녹음 있음(Step B에서 오디오 처리) · note: Notion 세션기록 요지(코치 내부 memo)
const SESSIONS = [
  { n: 1, date: "2026-02-09", rec: "S1", note: "문제상황: 새벽 4시 자꾸 깸, 누우면 바로 기절. 양압기 사용 중이나 잘 맞는지 모름.\n배경: 대기업 임원 퇴직 후 창업 준비로 혼자 개발. 가족은 미국. 저녁·술 약속 많았으나 줄이는 중.\n목표: 안 깨고 쭉 자고 싶음.\n클라이언트 피드백(첫 상담 후): 잘 들어주셨음 / 가능성 있다·없다 / 경험 기반이 좋았다." },
  { n: 2, date: "2026-02-23", rec: "S2", note: "최근 상태: 미국 방문·시차로 수면위생 악화. 바이브코딩으로 뇌 각성→취침 새벽 2시까지 밀림. 체감 취침 vs 수면앱 기록 차이.\n시도·제안: 압축수면(2/9·2/10 초기 긍정→작업몰입으로 실패), 반신욕, 소셜프레셔(취침 전 사진공유 인증).\n계획: 마지노선 23:30 취침, 저녁 루틴 시스템화(아침 루틴은 잘 지킴), 시차적응(기내식·수면 한국시각 조절)." },
  { n: 3, date: "2026-03-04", rec: "S3", note: "Flow limit 0.26. 질문지 피드백(답변 매일 달라 기록 어려움). Intake 확인: 침실 밝은 이유·중간각성 시 몽롱·수면앱 확인·낮잠 안 하는 이유('무너질 것 같아서').\n프로그램 안내: 5–8주, 매주 하나씩 조정. 다룰 항목: 수면일기(데이터 집착)·양압기 CBT·ESS·과각성. ESS 10–13 경미(✅).\n실천: 워치 보지 말기+수면일기(1주치 코치 전달), 낮잠 20분(졸릴 때만), wind down '정리하기'로 시작, 철분제.\n새벽 각성 대응: 15분(체감) 안 오면 침대 밖." },
  { n: 4, date: "2026-03-12", rec: null, note: "피드백: 현상만 지켜봄→오늘 시도할 장치 만들기가 목표. 낮 졸림 심하진 않음.\n해본 것: 데이터 안 봄, 슬립로그, 철분제(낯선 느낌 ✅), wind down(노트 2-3분 체크인·양압기 세팅·명상X). 새벽 3-4시 각성 시 코딩 추정→종이에 쓰기 ✅.\n취침목표 9:40, 기상 5:30 고정 희망. defensive해짐(슬립로그 있으니). 동기부여: 질문법 바꾸기·목표치 현실화.\n할일: 주간/자기전 기록 분리, wind down 시도, 요가 아침10:30→저녁8시, 7:30까지 커밋 ✅. (기상 후 쓰기 비몽사몽 → 눈뜬시간·침대나온시간 타이핑, '어제보다 어떠세요' 식 질문)" },
  { n: 5, date: "2026-03-23", rec: null, note: "💓 낮잠 시도 ✅(삶 망가지는 느낌→수면엔 좋겠다, 점심 후 혈당스파이크, 자고나서 개운까진 X). 기상시간 들락날락. 알람 없이 일어나기 ✅(수요일부터). 요가 아침으로. 바이브코딩 번아웃 ✅→TODO Skill 만듦. 컨디션 좋아짐(글쓰기로 체크).\n피드백: 구체적으로 적어 좋았음(저녁꺼 까먹음), '별거 아니다·이정돈 다들 겪음' 편안. 빡세게 안 살기로. 철분약 자꾸 까먹음.\n데이터리뷰: 삼성슬립 안 맞음·유실 많음(입면). 3/16부터 개선. 3/14부터 조교들과 방탕. 수업 3/6 시작(오후 3시간 몰아)." },
  { n: 6, date: "2026-03-31", rec: null, note: "지수님 메세지: 기록 부실(시계 못 참·해커톤 밤샘), 나머진 잘 잤음. 알람 없이 6:30-7:30 깸. 철분제 지속 ✅. 낮잠 가끔.\n하기로: 낮잠·철분제·알람 없이. 로그: 수면시간 너무 짧음·각성 거의 없음·기상 일정·취침은 '뭘 안 해야지' 하니.\n목요일까지 잠자는 루틴 시스템화 공유.\n어떠셨나: 마음 편해짐, 위로 정도, 낮 집중 약간, 2월 대비 하루종일 집중X는 개선, 저녁 업무 밀려 늦게 잠." },
  { n: 7, date: "2026-04-13", rec: null, note: "아침에 어제 것까지 적기. 시도: 거실로 나감(자극적X 예능 30분-1시간), 명상하고 잠(인사이트타이머). 기대치 조정(좋은날 대비 나쁜날 1:6). 2019년부터 양압기.\n할일: 좋은날 기록, 자기 전 AI코딩 멈추려 TV 보기 계속, 로그 아침 한 번만, 상기도근육강화 운동 영상 공유.\n사전 메시지: 특정 시간에 컴퓨터 닫고 거실 예능이 각성 낮춤. 밤에 뭐 돌려놓으면 아침 일찍 깨어 봄→중지. 아침에 코드 잡기도 루틴 망침→앉기 전 아침루틴 지키기." },
  { n: 8, date: "2026-05-07", rec: null, note: "깨진 않는데 수면의 질 떨어지는 듯(기상 시 개운 X). 총수면 늘려보자(기상 늦추기?). 루틴: 기상→요가→점심→일→저녁→일하다 잠. 약속 온라인→움직임 필요(이사?).\n긴장·불안 인지→why tree(본인 서비스)로 생각정리 많이 됨. 10시반 눕기로.\n시차적응 확인(멜라토닌·햇빛·운동)." },
  { n: 9, date: "2026-05-18", rec: null, note: "멜라토닌 딱히 안 먹음. 일찍 잠들기 어려운 이유→'일찍이 좋다'가 아니라 체감·목표와 얼라인 필요. '이것 끝내고 자야지'(창업). 잘 들었던 날 어떻게 가능했나. 레베카 스토리. 달리기·요가·외부일정·프라이머 행사. why tree 외부세션에서 에너지. 불안할 일 없는데 없었어. 고민 있을 때 인지셔플.\nTODO: 외부 일정 늘리기·바깥 에너지 써보기." },
  { n: 10, date: "2026-06-01", rec: null, note: "술약속 지난주 3번. 양압기 고정압력 시도 중. 눈 건조. 외부활동 많음·달리기 매일. 술 먹고 양압기 차면 더 좋은 듯. 10시 알람.\nTODO: (1)술+양압기 잘 자는지 테스트, (2)코딩 밤 10:30 마무리(마지노선)로 취침시간 일정하게. 철분제 3월 중순부터. 슬립케어 4월쯤 다 먹음→다시 보내주기로." },
  { n: 11, date: "2026-06-17", rec: "S11", note: "리포트 공유. 논의: 시스템화하고 싶다(보고 싶은 결과·도움받았다 느낀 지점·데이터 합치기).\n🎙️ 지수님(전 삼성 임원·창업자)께 역으로 조언 구한 파트(24분):\n1) 시스템화·데이터 로깅: 초기 신뢰(라포)·스몰윈 빨리·간편 입력·AI코칭은 데이터 채워져야 의미.\n2) 헬스데이터 익스포트: 삼성헬스/헬스커넥트/애플헬스, 직접 연동은 지금 과함.\n3) 시스템 2축: 온보딩(현 상태 명확·예측 가능) + 트래킹(추적·가시화).\n4) '별거 아니다'의 양면성: 안도 vs 무시당함, 라포가 좌우. AI가 같은 말은 위험.\n5) 그룹코칭(~20명) 아이디어(미정).\n⭐6) EAP B2B(기업 수면 복지): 스위치온다이어트 경험, 바이어≠커스터머, HR 생산성지표, 수면 isolate 포지셔닝이 강점, 보안 주의.\n7) 레퍼럴: 삼성의료원·부산 친구. 8) 대학원 심사 일정." },
  { n: 12, date: "2026-06-29", rec: null, note: "이비인후과: 구강호흡 가이드 잘 안 함, 마스크 코만(잘 새서 보통 비권장), 비중격 수술했으나 또 휨, 양압기 압력 6-9→5-8 원격 조절(광우메딕스), 고정압력이면 벗음.\n정신의학과: 양압기 튜닝 이해 없음·약 위주. 양압기센터·기사 상담.\nWhy tree 개발 관련: 구조 json 강제·페르소나 30명x3주 quality measure·Ralph looping·spec-3-week-simulation.md·비주얼 결과물 피드백 스킬." },
  { n: 13, date: "2026-07-14", rec: null, note: "(간략) 처이모부님 상으로 코칭 축소·조정 가능성. 로그 메모상 여행 다녀옴, 처가에서 함께 묵어 루틴 지키기 어려움." },
  { n: 14, date: "2026-07-27", rec: "S14", note: "이번 주 금요일 미국 출국(한 달).\n병원: 양압기 튜닝·수면다원검사 다시(2024년이 마지막)·수면시간 늘려보기. 뒤척임 많음. 철분부족→원인 찾기.\n'11:30에 마무리하는 게 너무 괴로움 → 12시로.'" },
  { n: 15, date: "2026-08-10", rec: "S15", note: "미국 시차적응(가려움증?·심리적 변화). 양압기 세팅 시간(오전엔?).\n8월말까지 8시간 수면 목표(수면압 올라왔을 때 자기·강의계획서 마무리·코딩은 도파민·애기 재우며 자기·양압기 착용 테스트). 9월초 PSG.\n오전 루틴: 학기 준비·약속·운동/명상. 새로운 수면 목표·시스템 피드백." },
];

// ── enrich 모드: 오디오 처리로 덮인 detail에 노션노트 memo 재병합 + 과거세션 잘못된 nextSessionDate 제거 ──
if (process.argv.includes("--enrich")) {
  const sql = neon(process.env.DATABASE_URL);
  let done = 0;
  for (const s of SESSIONS.filter((x) => x.rec)) {
    const row = (await sql`SELECT id, detail FROM sessions WHERE client_id=${CLIENT_ID} AND n=${s.n}`)[0];
    if (!row) continue;
    const d = row.detail || {};
    const block = `── 노션 세션기록 (${s.date}) ──\n${s.note}`;
    d.memo = d.memo ? (d.memo.includes("노션 세션기록") ? d.memo : `${d.memo}\n\n${block}`) : block;
    delete d.nextSessionDate; // 과거 세션이라 전사에서 잡힌 미래 날짜는 오해 소지 → 제거
    await sql`UPDATE sessions SET detail=${JSON.stringify(d)}::jsonb WHERE id=${row.id}`;
    console.log(`✅ S${s.n} memo 병합 + nextSessionDate 제거`);
    done++;
  }
  console.log(`enrich 완료: ${done}개`);
  process.exit(0);
}

const recCount = SESSIONS.filter((s) => s.rec).length;
console.log(`\n=== 이지수 세션 마이그레이션 ${COMMIT ? "(COMMIT)" : "(DRY-RUN)"} ===`);
console.log(`세션 ${SESSIONS.length}개 (녹음 ${recCount}개: ${SESSIONS.filter(s => s.rec).map(s => s.rec).join("·")}) · 전부 비공개(published=false), S15는 기존 공개상태 유지\n`);
for (const s of SESSIONS) {
  console.log(`S${s.n}  ${s.date}  ${s.rec ? "🎙️" + s.rec : "  텍스트"}  ${s.note.split("\n")[0].slice(0, 46)}…`);
}

if (!COMMIT) { console.log(`\n※ DRY-RUN. 실제 저장하려면 --commit`); process.exit(0); }

const sql = neon(process.env.DATABASE_URL);
// 1) 기존 세션(현재 n=1) → n=15로 정정 + 노션 8/10 노트 병합(기존 오디오 detail 보존)
const ex = (await sql`SELECT id, detail FROM sessions WHERE id=${EXISTING_S15_ID}`)[0];
if (ex) {
  const d = ex.detail || {};
  const s15 = SESSIONS.find((x) => x.n === 15);
  const noteBlock = `── 노션 세션기록 (8/10) ──\n${s15.note}`;
  d.memo = d.memo ? (d.memo.includes("노션 세션기록") ? d.memo : `${d.memo}\n\n${noteBlock}`) : noteBlock;
  await sql`UPDATE sessions SET n=15, title='이지수 S15', session_at=${s15.date + "T00:00:00+09:00"}, detail=${JSON.stringify(d)}::jsonb WHERE id=${EXISTING_S15_ID}`;
  console.log("✅ 기존 세션 → n=15(8/10) 정정 + 노션노트 병합");
}
// 2) n=1..14 upsert (client_id,n 기준)
let ins = 0, upd = 0;
for (const s of SESSIONS) {
  if (s.n === 15) continue;
  const existing = (await sql`SELECT id FROM sessions WHERE client_id=${CLIENT_ID} AND n=${s.n}`)[0];
  const detail = { memo: `── 노션 세션기록 (${s.date}) ──\n${s.note}` };
  if (existing) {
    await sql`UPDATE sessions SET title=${"이지수 S" + s.n}, session_at=${s.date + "T00:00:00+09:00"}, detail=${JSON.stringify(detail)}::jsonb WHERE id=${existing.id}`;
    upd++;
  } else {
    await sql`INSERT INTO sessions (client_id, n, title, session_at, detail, published)
      VALUES (${CLIENT_ID}, ${s.n}, ${"이지수 S" + s.n}, ${s.date + "T00:00:00+09:00"}, ${JSON.stringify(detail)}::jsonb, false)`;
    ins++;
  }
}
console.log(`✅ 세션 삽입 ${ins} · 갱신 ${upd} (+ S15 정정)`);
