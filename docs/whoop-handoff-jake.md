# WHOOP 연동 개발 핸드오프 (Jake)

> 담당: Jake · 작성: Emma(NOCT) · 최종 수정: 2026-10-12
> 이 문서 = 온보딩 + 작업 범위 + 체크리스트. **상세 설계는 [`whoop-integration-design.md`](./whoop-integration-design.md) 를 먼저 끝까지 읽어주세요.**

---

## 0. 한 줄 요약

선수앱(`noctresearch`)에 WHOOP 밴드를 **OAuth로 한 번 연결하면, 이후 수면단계·HRV·recovery 데이터가 웹훅으로 자동 유입**되게 만드는 작업.
수동 export(가민 방식)와 달리 선수가 한 번만 연결하면 끝. 대상은 WHOOP를 쓰는 선수(주로 해외 원정 프로) 한정.

- 레포: `github.com/emma285/noctresearch`
- 프로덕션: https://noctresearch.vercel.app (`main` 브랜치 자동배포)
- 스택: Next.js App Router + Vercel + Neon Postgres(drizzle) + Clerk
- 현재 구현 상태: **0%** (설계만 확정). WHOOP 관련 코드/테이블/크론 아직 없음.

---

## 1. 먼저 읽을 것 (순서대로)

1. [`whoop-integration-design.md`](./whoop-integration-design.md) — 전체 설계. 스키마·라우트·웹훅·토큰 refresh 크론까지 다 있음. **이게 메인 레퍼런스.**
2. WHOOP 공식 문서: `developer.whoop.com/docs` (OAuth / Webhooks / Rate limiting / App approval)
3. 레포 기존 패턴 참고:
   - DB 스키마 컨벤션: `lib/db/schema.js`
   - 크론 인증 패턴: 기존 `routine-check` 라우트 (`CRON_SECRET` Bearer 확인) 복사해서 씀
   - Neon 저장 헬퍼: `lib/attachments.js` (`saveAttachment` 등), `userEmail` 키 매핑 방식

---

## 2. 받아야 할 접근권 (Emma가 부여)

| 항목 | 내용 | 상태 |
|---|---|---|
| GitHub | `emma285/noctresearch` collaborator (write) | ⬜ |
| Vercel | 프로젝트 멤버 초대 (프리뷰 배포·env·로그 열람) | ⬜ |
| Neon | `DATABASE_URL` (drizzle 마이그레이션용) | ⬜ |
| WHOOP env | `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` / `WHOOP_TOKEN_ENC_KEY` | ⬜ (Phase 0 끝나야 발급됨) |

> env는 `.env.local`(로컬) + Vercel 3환경(Production/Preview/Development) 모두에 넣어야 함.

---

## 3. 로컬 세팅

```bash
git clone https://github.com/emma285/noctresearch.git
cd noctresearch
npm install
cp .env.example .env.local   # Emma한테 실제 값 받아 채우기 (없으면 Emma에게 요청)
npm run dev                  # http://localhost:3000
```

작업 브랜치:
```bash
git checkout -b feat/whoop
```
- `main` 직접 푸시 금지. **반드시 `feat/whoop` 브랜치에서 작업 → Vercel 프리뷰 배포로 검증 → PR → Emma 확인 후 머지.**
- 브랜치 푸시하면 Vercel이 프리뷰 URL 자동 생성해줌.

---

## 4. ⚠️ Phase 0 (Emma 몫, 블로커) — 코드보다 먼저

Jake가 **실제 연결 테스트**를 하려면 아래가 먼저 나와야 함. 단, **코드 자체는 Client ID/Secret 없이도 미리 짤 수 있음** (연결 테스트만 발급 후 가능).

- [ ] `developer-dashboard.whoop.com` 앱 등록 → `Client ID` / `Client Secret` 발급
- [ ] Redirect URI 등록 (대시보드값과 **정확히 일치**해야 함):
  - `https://noctresearch.vercel.app/api/whoop/callback`
  - `http://localhost:3000/api/whoop/callback` (로컬 테스트용)
- [ ] **승인 신청 동시 제출** (개발단계 최대 10명 연결, 실서비스 >10명은 심사 수 주 소요)
  - 준비물: 개인정보처리방침 URL · 앱이름/**연락이메일 = `contact@noct-research.com`**(신규 가입·연동은 이 이메일로 통일) · "Connect with WHOOP" 버튼(브랜드 가이드) · 테스트 1명

> Jake: Phase 1~2 코드는 Phase 0 기다리지 말고 바로 시작해도 됨. `/callback`의 실제 token 교환 검증만 Client ID 나온 뒤에.

---

## 5. 작업 범위 (Phase 1~3) + 완료 기준

### Phase 1 — OAuth 연결 + 저장
- [ ] Neon 스키마 추가: `whoop_connections` / `whoop_sleep` / `whoop_recovery` (설계문서 §4 그대로) → `drizzle-kit generate` → 마이그레이션
- [ ] `GET /api/whoop/connect` — state(CSRF, Clerk uid 바인딩) 생성 후 WHOOP authorize로 302
- [ ] `GET /api/whoop/callback` — `code` → token 교환 → **AES-256-GCM 암호화** 후 `whoop_connections` upsert → 초기 30일 백필
- [ ] `GET /api/whoop/status` / `POST /api/whoop/disconnect`
- **완료 기준(DoD)**: 본인 WHOOP 계정 1개로 연결 → 토큰 암호화 저장 확인 → 과거 30일 수면/회복 데이터가 Neon에 들어옴

### Phase 2 — 자동 유입 (웹훅 + 토큰 갱신)
- [ ] `POST /api/whoop/webhook` — HMAC 서명검증(`WHOOP_CLIENT_SECRET`) → 리소스 GET → upsert. `trace_id`로 중복처리 방지
- [ ] `GET /api/cron/whoop-refresh` — `vercel.json` crons에 매시간 등록. 만료임박 토큰 갱신(**rotating: 새 refresh 토큰 반드시 덮어쓰기**), 실패 시 `status='needs_reauth'`
- **완료 기준(DoD)**: WHOOP 대시보드에 웹훅 URL 등록 → 새 수면 기록 생기면 자동으로 Neon에 upsert 됨 / 토큰이 1시간 뒤 자동 갱신됨

### Phase 3 — 포탈 리포트 시각화
- [ ] 포탈(`/portal`)에 "WHOOP 연결하기" 카드 (웨어러블=WHOOP 선택 선수에게)
- [ ] 리포트에 수면단계 막대 · 수면효율 · HRV 추이 · recovery score · 안정시심박
- **완료 기준(DoD)**: 연결된 선수 포탈에서 위 지표가 보임. **값 없는 날(`score_state≠SCORED`)은 그리지 않고 점선/미정 처리**

---

## 6. 반드시 지킬 레포 룰 (중요)

이거 어기면 리뷰에서 반려돼요.

- **토큰 평문 저장 절대 금지.** access/refresh 토큰은 `WHOOP_TOKEN_ENC_KEY`로 AES-256-GCM 암호화 후 Neon 저장.
- **refresh 토큰은 rotating.** 갱신할 때마다 새 refresh 토큰이 반환됨 → 반드시 덮어쓰기 저장(옛것 무효화).
- **없는 데이터 임의로 그리기 금지.** `score_state`가 `SCORED`가 아니면 값이 없음 → 행은 저장하되 값은 null, 시각화에선 점선/미정으로.
- **사람 매핑 키 = `userEmail`** (Clerk 이메일). logs·attachments와 동일 키.
- **원본 보존.** 응답 전체를 `raw` jsonb 컬럼에 통째로 저장(전 필드 보존).
- **rate limit 100/분·10k/일** → 폴링 말고 웹훅 중심. 백필/페이지네이션 때만 제한적으로 GET.
- **선수 화면은 AppShell 안에서** (하단 탭바 유지). 코치 raw-route 패턴 복사 금지.
- **디자인 톤**: 인디고 `#4355B0` + 스카이 `#7EC8E3` + 네이비 `#0D1B2A`. **이모지 금지(lucide 아이콘 사용)**, 카드 좌측 강조바 금지.

---

## 7. 열린 리스크 / 주의 (설계문서 §8)

1. **refresh 토큰 TTL 미공개** → 만료/폐기 대비 `needs_reauth` 폴백 필수 (포탈에서 "재연결" 유도).
2. **개발 10명 cap** → 실서비스 전에 승인 심사 통과해야 함 (Phase 0에서 신청).
3. **`cycle.*` 웹훅 없음** → strain 데이터 필요하면 recovery 웹훅 올 때 `/v2/cycle` 폴링으로 당김.
4. **공식 JS SDK 없음** → OpenAPI(`api.prod.whoop.com/developer/doc/openapi.json`)로 타입 생성 권장.
5. WHOOP v1 API는 2025-10-01 종료됨 → **v2만 사용** (base `api.prod.whoop.com/developer`, 엔드포인트 `/v2/...`).

---

## 8. 진행 순서 요약

```
Phase 0 (Emma)  앱 등록 + Client ID 발급 + 승인 신청        ← 지금
   │  (코드는 기다리지 말고 병행)
Phase 1 (Jake)  OAuth connect/callback + 암호화 저장 + 30일 백필 → 본인 웁 1명 검증
Phase 2 (Jake)  웹훅 수신 + refresh 크론 → 자동 유입
Phase 3 (Jake)  포탈 리포트 시각화
```

막히거나 설계문서에 없는 결정이 필요하면 Emma에게 바로 물어봐주세요. 임의 수치/추측으로 채우지 말고요.
