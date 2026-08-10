# 마스터 기준 재정비 — 핸드오프

> **목표 한 줄**: 로그 페이지 · 포털 · 코치 페이지가 각자 흩어진 소스(Clerk publicMetadata + 하드코딩 + DB별 이메일 조회) 대신 **Notion "코칭 클라이언트 (마스터)" 하나를 기준(single source of truth)**으로 돌게 재정비한다.
>
> 이 문서는 sleep-coaching 세션(2026-08-09, 윤이나 S1 데이터화 작업)에서 넘어온 핸드오프다. 새 세션은 이 repo(`~/automation/claude_ai/coaching_clientintake/noctresearch`)에서 시작.

---

## 0. 왜 이 작업인가

- 방금 Notion에 **마스터 DB를 중앙 명부로 살렸다**(코칭 세션 인덱스 · 인터벤션 트래커 신설 + 마스터에 Intake/세션/인터벤션/준비자료/선수기록 relation 연결).
- 그런데 **앱(윤이나가 쓰는 화면)은 아직 마스터를 안 본다.** 상태는 Clerk `publicMetadata`, 여정 문구·날짜는 코드에 하드코딩.
- 그래서 "마스터 = 앱 구동"이 되도록 앱을 배선하는 게 이 작업.

---

## 1. 지금 앱이 도는 방식 (as-is)

### 진실의 원천 = Clerk publicMetadata (마스터 아님)
포털·코치 화면은 Clerk 유저의 `publicMetadata` 플래그로 상태를 판단한다.

| 필드 | 쓰는 곳(write) | 읽는 곳(read) |
|---|---|---|
| `intakeDone` | `app/api/submit/route.js:600` | portal, coach/athlete |
| `prepDone` | `app/api/prep/route.js:43` | portal |
| `firstSessionAt` · `sessionLabel` · `programWeeks` | `app/api/coach/assign/route.js:40` | portal(여정 날짜), coach |
| `reportUrl` · `guideUrl` · `dataUrl` | coach/assign | portal, athleteAssets |
| `publishedReports` (slug 배열) · `reportPublished` | `app/api/coach/publish-report/route.js:39` | portal(리포트 카드 오픈) |
| `name`(unsafeMetadata) | sign-up | 전역 |

### 라이브 데이터 DB = 이메일 키로 직접 조회
| 용도 | DB id | 매칭 키 | 라우트 |
|---|---|---|---|
| Intake(사전질문지) | `NOTION_DATABASE_ID`(env) | 이메일 | `app/api/submit/route.js` |
| Prep(준비자료 /prep) | `3b5565bc034381aab23efdac3a6c6574` | `이메일` | `app/api/prep/route.js` |
| Log(선수기록 수면·루틴) | `3b7565bc0343...916d318` | `계정`(=이메일) | `app/api/log/route.js` (인증 없음, body의 user=이메일) |

### 하드코딩된 것
- `app/portal/page.js` — `JOURNEY_PRE` / `JOURNEY_DONE` 여정 문구 배열. **날짜까지 박힘**(예: `"이번 주 일요일(8월 9일) · 오전 10시"`). `CLIENT = { name: "김프로" ... }` 더미.
- `lib/athleteAssets.js` — 선수별 자료(리포트 slug 등)가 레지스트리에 하드코딩(예: `yuna-report`). metadata 지정분이 있으면 우선.

---

## 2. 목표 상태 (to-be)

### 마스터 DB (진실의 원천)
- **DB**: "코칭 클라이언트 (마스터)" · db `2aed85ca21de485f812b6e4ccfc5ffce` · **ds `collection://3e2e16f3-e69c-4218-8680-19160edd0950`**
- **부모 허브**: "🏌️ 운동선수 정식 코칭 시스템" `3b4565bc03438188a4f8dba94a4ea90f`
- **매칭 키**: `이메일` (Clerk 로그인 이메일과 매칭)
- **핵심 필드**:
  - `상태`(select): 초대됨 → 로그인 → intake제출 → 리포트게시 → 온보딩완료 → 진행중 → 종료. **여정 단계 = 카드 lock/unlock 근거**
  - `이름` · `종목` · `티어` · `시작일` · `다음 세션` · `코칭 주차` · `Clerk 유저ID` · `대시보드 토큰`
  - relation: `Intake` · `주간 데이터` · `코칭 세션` · `인터벤션` · `준비 자료`(→`3b5565bc-0343-8110...`) · `선수 기록`(→`3b7565bc-0343-8122...`)
- 현재 행: **윤이나 1명뿐**(page `3b8565bc0343816e98b0fd9358f1efab`, 이메일 yoonina0502@naver.com, 상태 진행중). 나머지 유저는 아직 마스터에 없음 → **백필 필요**.

### 원하는 동작
- 포털: 로그인 이메일로 마스터 행 조회 → `상태`로 여정/카드, `다음 세션`으로 날짜(하드코딩 제거), 리포트 relation으로 리포트 카드.
- 코치 페이지: 배정·리포트 게시가 Clerk metadata 대신(또는 함께) **마스터 행을 갱신**.
- 로그/준비자료: 이미 이메일 키 → 기록 시 마스터의 `선수 기록`/`준비 자료` relation도 자동 연결(선택).

---

## 3. 재정비 순서 (리스크 낮은 것 → 높은 것)

- **A. 읽기 기반 추가 (무해)**
  - env `NOTION_MASTER_DATABASE_ID = 2aed85ca...` (ds `3e2e16f3...`) 추가
  - `lib/master.js` 신설: `getAthleteByEmail(email)` → 마스터 행(상태·다음세션·종목·티어·주차·relation) 반환
  - `app/api/me/route.js` 신설: 현재 로그인 유저(Clerk 이메일)의 마스터 레코드 반환 (read-only)
- **B. 포털 표시부터 마스터로 (시각만)**
  - `app/portal/page.js`: 여정 날짜/문구를 `다음 세션`·`상태` 기반으로 생성 → 하드코딩 date 제거. 윤이나로 눈으로 확인.
- **C. 카드 lock/unlock을 `상태`로 전환 (동작 변경)**
  - publicMetadata 분기 → 마스터 `상태` 분기로 교체. 단계별 노출 규칙 표로 확정 후 적용.
- **D. 쓰기 경로도 마스터로**
  - `coach/assign`·`coach/publish-report`: 마스터 행 update(다음세션·상태·리포트 relation). submit/prep: 마스터 `상태` 전이(intake제출 등) + relation 연결. log: 저장 시 마스터 `선수 기록` relation 연결.
- **E. 백필 + 단일 소스 확정**
  - 기존 Clerk 유저 → 마스터 행 생성/동기화(이메일 기준). 신규 가입 시 마스터 행 자동 생성(Clerk webhook 또는 submit 시).
  - Clerk publicMetadata를 버릴지/캐시로 남길지 결정.

---

## 3-bis. 로그 페이지: 정적 → PWA + 로그인 유지 (Emma 요청 2026-08-09)

**현황**: 로그 페이지 윤이나 버전은 **정적(login-less)** 으로 만들어짐(URL/`계정`=이메일로 구분, `app/api/log` write). 매번 링크로 들어가는 방식.

**원하는 흐름**: 첫 화면에서 로그인 1회 → "홈 화면에 추가"(앱 아이콘) → 이후 아이콘 탭하면 **자동 로그인된 상태**로 바로 로그 입력.

**= PWA + 세션 유지**. 표준 구현:
- **PWA화**: `manifest.json`(앱 이름·아이콘·`display:standalone`) + service worker(오프라인/설치 가능). Next.js에 추가.
- **로그인 유지**: Clerk 세션은 쿠키로 장기 유지 → 한 번 로그인하면 계속 로그인 상태. 로그 페이지를 **Clerk 인증 라우트로 편입**(현재 login-less → 인증형).
- **홈 화면 설치**: PWA면 iOS/안드 모두 "홈 화면에 추가" 지원. 설치 후 standalone으로 열리고 세션 유지됨.

**이 재정비와 합치는 이점**: 로그 페이지가 같은 로그인 앱 안으로 들어오면, 이메일로 마스터·`선수 기록` DB에 그대로 연결됨(별도 login-less 경로 제거). 즉 **로그 페이지도 마스터 기준으로 통합**됨.

**주의/확인거리**:
- iOS standalone PWA에서 Clerk 세션 지속 정상인지 실기 확인(대체로 OK, 예전 사파리 쿠키 이슈만 체크).
- 기존 login-less 링크를 쓰던 선수 있으면 마이그레이션(로그인 방식으로 안내).
- 아이콘/스플래시/앱명 등 브랜드 에셋 필요(sojung/NOCT 톤).

→ 순서상 이 작업은 **B~D 단계와 함께**(로그 페이지를 인증형으로 옮기며 마스터 연결) 진행하는 게 자연스러움.

### 인증 방침 확정 (Emma 2026-08-09): "입구는 두 개, 열쇠는 하나"
- **로그인 화면(입구)은 분리**: 포털용(`/sign-in` → `/portal`)과 **로그 앱 전용 로그인 페이지**(자체 URL·자체 브랜딩 → 로그인 후 바로 `/log`). 홈 화면 아이콘도 로그 앱 전용.
- **계정(identity)은 하나**: 같은 Clerk 인스턴스·같은 이메일 계정. **별도 계정/비번 만들지 말 것**(선수가 비번 2개 외우게 하면 안 됨). 계정이 하나여야 이메일로 마스터에 붙어 통합이 유지됨.
- 구현: Clerk 사인인 컴포넌트/라우트를 하나 더 두고 `forceRedirectUrl`/`fallbackRedirectUrl`만 `/log`로 다르게. 유저 풀은 공유.

---

## 3-ter. 코치 포털에 "세션노트" 표시 (Emma 요청 2026-08-10)

**요구**: **코치 포털 웹사이트**(`/coach/athlete/[uid]`)에서 그 선수의 **세션노트(SOAP)**를 볼 수 있게 한다. **선수 포털엔 노출 안 함**(코치 전용). Notion에서 보는 게 아니라 앱 화면에서 봄.

**현황**: 코치 포털엔 세션노트 기능 **없음**. 노트는 지금 **로컬 md에만** 있음:
- `~/…/윤이나 (2026.08.09 - )/윤이나_S1_코치세션노트.md` (SOAP)
- `…/윤이나_S1_세션기록.md` (전사 기반 상세, 화자구분)

**데이터 소스(백엔드)**: 방금 만든 Notion **`코칭 세션` DB** (db `349e906e42e94e1592679d390fbe2916` / ds `collection://76976596-f259-4140-b957-aea2ae697dd0`). 선수별 세션 행이 여기 있고(윤이나 S1 = `3b8565bc03438127a18bd052d4de29b3`), 마스터 `코칭 세션` relation으로 연결됨. → **세션노트 본문을 이 세션 행에 저장**하고, 코치 포털이 읽어 렌더.

**구현 스케치**:
- `app/api/coach/sessions/route.js` 신설: `?email=`(또는 uid→email) → 마스터 relation(또는 코칭 세션 DB에서 선수 매칭)로 그 선수의 세션 목록 + 각 세션 노트(blocks/속성) 반환. `lib/coach` 인증 가드 필수.
- `app/coach/athlete/[uid]/page.js`: 세션 타임라인 + 세션별 노트(SOAP 접기/펼치기) 섹션 추가.
- 저장 포맷 결정: (a)세션 행 본문 blocks에 SOAP 저장 → 앱이 fetch (권장, 단일 소스) / (b)rich_text 필드 / (c)로컬 md는 아카이브로만.
- 노트 입력 흐름: 세션 후 코치가 노트를 어디서 쓰나 — Notion 세션 행에 직접 or 코치 포털에 작성 UI. → 우선은 Notion 세션 행 본문에 붙이고 앱은 읽기 전용으로 시작.

---

## 4. 새 세션에서 먼저 정할 것 (결정 포인트)

1. **단일 소스 정책**: 마스터를 진실로, Clerk metadata는 (a)완전 폐기 (b)빠른 클라 읽기용 캐시로 미러. → 권장: 서버에서 마스터 read, metadata 미러는 선택.
2. **신규 가입 시 마스터 행 생성 주체**: Clerk signup webhook vs submit(intake) 시점 vs 코치 수동. → 권장: submit 시점에 없으면 생성(이메일 기준 upsert).
3. **`상태` → 카드 노출 매핑표** 확정(각 상태에서 뭐가 열리고 잠기는지).
4. 배포: Vercel. 프로덕션(윤이나 사용 중)이라 프리뷰에서 검증 후 승격.

---

## 5. 참고 파일 지도

- 포털: `app/portal/page.js` (여정·카드, 현재 Clerk metadata + 하드코딩)
- 코치: `app/coach/assign/page.js`, `app/coach/athlete/[uid]/page.js`, `app/api/coach/{assign,publish-report,file}/route.js`
- 로그: `app/log/*`(프론트는 log 페이지 확인) · `app/api/log/route.js`
- 자료 연결: `lib/athleteAssets.js` (레지스트리 하드코딩 → 마스터 relation으로 이관 검토)
- 코치 판별: `lib/coach.js` (env `COACH_EMAILS`)
- 관련 메모리: sleep-coaching `project-coaching-intervention-tracker` · `project-noctresearch-athlete-app`

---

*이 문서 기준으로 새 세션 시작: repo cwd = 위 경로, "마스터 기준 재정비 A단계부터" 로 진입.*

---

## 진행 로그

### ✅ A단계 완료 (2026-08-10) — 읽기 기반 추가(무해)
- `.env`: `NOTION_MASTER_DATABASE_ID=2aed85ca21de485f812b6e4ccfc5ffce` 추가 (ds `collection://3e2e16f3-e69c-4218-8680-19160edd0950`)
- `lib/master.js` 신설: `getAthleteByEmail(email)` + `normalizeMasterRow(page)` + `MASTER_DB_ID`
  - 실제 스키마 반영: `이메일`(매칭키)·`이름`·`상태`(초대됨/로그인/intake제출/리포트게시/온보딩완료/진행중/종료)·`종목`·`티어`·`시작일`·`다음 세션`·`코칭 주차`·`Clerk 유저ID`·`대시보드 토큰`·`연락처` + relation 6종(intake/weekly/sessions/interventions/prep/records)
  - 통합 미연결/에러 시 `null` 반환 → 호출부가 기존 경로로 폴백(앱 안 죽음)
- `app/api/me/route.js` 신설: 로그인 유저(Clerk 이메일)의 마스터 레코드 read-only 반환. `{ authenticated, email, name, inMaster, athlete }`
- 검증: 마스터 윤이나 행 정상 조회(yoonina0502@naver.com · 진행중 · 골프 · 1:1 프리미엄 · 다음세션 2026-08-14 · 주차 1). 두 파일 syntax OK.

### A단계 후 Emma 수동 조치
1. ✅ **Notion 통합 연결 완료**(2026-08-10): 마스터 DB를 noct 통합에 연결함. getAthleteByEmail 실작동 확인(윤이나 조회 OK).
2. 🔴 **Vercel env 아직**: 프로덕션에 `NOTION_MASTER_DATABASE_ID=2aed85ca21de485f812b6e4ccfc5ffce` 추가 후 재배포 필요. (로컬 `.env`엔 이미 넣음) — **B단계 배포 승격 직전에 함께**.

### ✅ B단계 완료 (2026-08-10, 코드/빌드 검증까지) — 포털 표시를 마스터로 (시각만)
- `app/portal/page.js`: `getAthleteByEmail(myEmail)` 조회 추가. 마스터 있으면 진실:
  - `done`(여정 단계) = 마스터 `상태`(MASTER_DONE_STATES=intake제출/리포트게시/온보딩완료/진행중/종료) 기준. 마스터 없으면 Clerk `intakeDone` 폴백.
  - `firstSessionAt` = 마스터 `다음 세션` 우선 → 하드코딩 `2026-08-09` 미리보기 기본값 제거(폴백으로만 남음). 세션 라벨·D-day KPI가 여기서 파생.
  - `clientName` = 마스터 `이름` 우선.
- **additive·비파괴**: 마스터에 없는 유저는 기존 Clerk 경로 그대로. 마스터 조회 실패 시 null→폴백(앱 안 죽음).
- 검증: `npm run build` 통과(/api/me·/portal 클린). 윤이나 시뮬레이션 → done=true · "8월 14일(금) · 오전 10시" · D-4.
- ⚠️ **아직 프로덕션 미배포**(main=자동배포라 푸시 보류). 라이브 눈확인은 프리뷰 배포 or 로컬 dev에서.

### ✅ 진행중(ongoing) 뷰 신설 (2026-08-10, C단계 일부 선반영) — Emma 요청
- 계기: 윤이나는 1차 끝·2차 미정인데 포털이 "첫 세션" 서사라 안 맞음.
- `app/portal/page.js`:
  - `sessionCount` = 마스터 `코칭 세션` relation 개수. **N회차 카운트**(주차 아님, Emma 지정). `ongoing = athlete && sessionCount>=1`.
  - ongoing이면: 배지 "코칭 진행중" · KPI[다음 세션(날짜/‘조율 중’) · N회 진행한 세션 · 프로그램주] · 여정 `JOURNEY_ONGOING`(다음 세션 · N+1회차, 날짜 미정이면 "일정 조율 중").
  - `다음 세션` 없으면 KPI "조율 중" + 여정 "일정 조율 중". (pre/done 경로는 그대로)
  - 코치 미리보기 파라미터 추가: `/portal?as=<선수이메일>` (코치 전용 가드). 미리보기 `?stage=ongoing`도 지원.
- 데이터 정리(윤이나 마스터 행 `3b8565bc0343816e98b0fd9358f1efab`): `다음 세션` 비움(2차 미정), `코칭 세션`=S1(`3b8565bc03438127a18bd052d4de29b3`) 연결.
- 검증(noct 통합 읽기): 세션수 1 → 배지 코칭 진행중 · KPI[조율 중·1회·8주] · 여정 "다음 세션·2회차/일정 조율 중". build 통과.

### 🔑 함정 기록 — Notion relation은 연결된 페이지도 통합 권한 필요
- 마스터 `코칭 세션`에 S1을 연결해도, **세션 DB가 noct에 연결 안 되면 통합이 읽을 때 relation이 빈 배열**로 나옴(권한 필터링).
- 해결: 부모 허브 **"🏌️ 운동선수 정식 코칭 시스템"**(`3b4565bc03438188a4f8dba94a4ea90f`)를 noct에 연결(하위 적용) → 세션·인터벤션·기록 DB 일괄 커버. (2026-08-10 완료)
- 교훈: 앞으로 마스터 relation(리포트·기록 등)을 앱에서 읽으려면 **그 대상 DB도 noct 연결 필수**.

### ✅ 리포트 공개상태 마스터 이관 + 리포트 아카이브 UI (2026-08-10, D단계 일부)
- **마스터 스키마**: `공개 리포트`(rich_text, 공개 slug 목록 공백구분) 속성 추가. 윤이나=`yuna-report` seed.
- **`lib/master.js`**: normalize에 `publishedReports`(split) 추가 + `setPublishedReports(pageId, slugs)` 헬퍼.
- **`app/portal/page.js`**: 공개 판정 `pub = athlete ? Set(athlete.publishedReports) : Clerk폴백`. resolveAssets는 `lookupEmail`로 조회 → 미리보기(코치)에서도 선수 기준 정확. → 코치 metadata 한계 해소.
- **`lib/athleteAssets.js`**: 리포트에 아카이브 메타(`date`·`badge`·`chips`·`desc`) 추가. resolveAssets가 실어 나름.
- **UI**: "내 수면 공간"(SPACE 잠금카드들) → **리포트 아카이브**(지수님 `~/automation/sleep-coaching/jisu-hub/index.html` 미러). 날짜+차수뱃지/제목/칩/설명/화살표 카드 최신순 + "예정(NEXT)" 점선카드. `.noct-hub` 스코프 CSS(archive/acard/adate/ameta/achip/ago/soon).
- **`app/api/coach/publish-report/route.js`**: Clerk 저장 후 마스터 `공개 리포트`도 additive 갱신(이메일→pageId→setPublishedReports).
- 검증: 마스터 공개리포트=["yuna-report"], build 통과. 미리보기서 1차 리포트 카드 + 예정카드 노출.
- 참고: `SPACE` const·`.scard`/`.slock` CSS·LockIcon은 이제 미사용(무해, 정리 선택).

### ▶ 다음 선택지
- **승격**: 로컬/미리보기 눈확인 OK → 브랜치(master-rewire-b) main 머지 → 프로덕션. (Vercel master env 이미 추가됨)
- **C단계 나머지**: 카드 lock/unlock 전체를 `상태`로 매핑(노출 규칙표 확정).
- **D단계**: 쓰기 경로(coach assign/publish-report, submit/prep, log)를 마스터로. 리포트 공개상태 마스터 이관 포함.
