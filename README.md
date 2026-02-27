# 🌙 Noct Research — 수면 코칭 사전 질문지

Typeform 스타일 인터랙티브 질문지 + Notion 자동 적재 시스템

---

## 📋 포함 기능

- ✅ 한 문항씩 넘어가는 Typeform 스타일 UX
- ✅ 다크 테마 + 수면 브랜딩
- ✅ 모바일 완전 대응
- ✅ 키보드 네비게이션 (Enter로 다음)
- ✅ Notion 자동 적재
- ✅ **자동 분석** — 수면 효율, Epworth 합산, 사회적 시차, 준비도, 레드플래그 자동 감지
- ✅ 질문지 v3 (32문항 + Epworth 8 + 준비도 8)

---

## 🚀 배포 방법 (15분 소요)

### Step 1: GitHub에 올리기

1. [github.com](https://github.com) 로그인
2. 우측 상단 **+** → **New repository**
3. Repository name: `noctresearch-intake`
4. **Private** 선택 → **Create repository**
5. 이 폴더의 모든 파일을 업로드 (또는 git push)

```bash
# 터미널에서:
cd noctresearch
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/noctresearch-intake.git
git branch -M main
git push -u origin main
```

### Step 2: Vercel 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub으로 로그인
2. **Add New Project** 클릭
3. `noctresearch-intake` 저장소 선택 → **Import**
4. Framework Preset: **Next.js** (자동 감지됨)
5. **Deploy** 클릭
6. 약 1~2분 후 배포 완료!

배포 완료 시 주소: `https://noctresearch-intake.vercel.app`

> 💡 **주소 변경**: Vercel Dashboard → Settings → Domains에서
> `noctresearch.vercel.app`로 변경 가능

### Step 3: Notion 연동 설정

> ✅ **데이터베이스는 이미 생성되어 있습니다!**
> Database ID: `3c039b6567564d68b7dfff6384ee330c`

#### 3-1. Notion Integration 생성 (API 키만 받으면 됨)

1. [notion.so/my-integrations](https://www.notion.so/my-integrations) 접속
2. **+ New integration** 클릭
3. 이름: `수면코칭 질문지`
4. **Submit** → API 키 복사 (ntn_으로 시작)

#### 3-2. Integration 연결

1. Notion에서 `수면코칭 사전질문지` 데이터베이스 열기
2. 우측 상단 **⋯** 클릭
3. **Connections** → 방금 만든 `수면코칭 질문지` 선택
4. **Confirm**

#### 3-3. Vercel에 환경 변수 추가

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 아래 두 개 추가:

| Key | Value |
|-----|-------|
| `NOTION_API_KEY` | ntn_으로 시작하는 API 키 |
| `NOTION_DATABASE_ID` | 위에서 복사한 Database ID |

4. **Save** → **Deployments** 탭에서 **Redeploy**

---

## 🎯 자동 분석 기능 설명

폼 제출 시 아래 항목이 자동으로 계산되어 Notion에 저장됩니다:

### 수면 효율 (Sleep Efficiency)
- 계산: (실제 수면 시간 / 침대 시간) × 100
- 85% 이상 정상, 75% 미만 주의

### Epworth 졸림 점수
- 8개 상황 졸림도 합산 (0~24)
- 10 이하 정상, 11~14 경도, 15+ 고도

### 사회적 시차 (Social Jet Lag)
- 평일/주말 수면 중앙점 차이
- 60분 이상이면 생체시계 불일치 의심

### 레드플래그 자동 감지
- Epworth ≥ 11
- 수면무호흡/기면증 의심 증상
- 안전 리스크 (운전 중 졸음 등)
- 수면 효율 75% 미만
- 수면 파국적 사고/불안 높음

---

## 📁 프로젝트 구조

```
noctresearch/
├── app/
│   ├── layout.js          # 레이아웃 + 메타데이터
│   ├── page.js            # 메인 페이지
│   ├── globals.css        # 전역 스타일
│   └── api/submit/
│       └── route.js       # Notion API + 자동 분석
├── components/
│   └── IntakeForm.jsx     # 메인 폼 컴포넌트
├── data/
│   └── questions.js       # 질문 데이터 (수정 가능)
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env.example
```

---

## ✏️ 질문 수정하기

`data/questions.js` 파일에서 질문을 수정/추가/삭제할 수 있습니다.
수정 후 git push하면 Vercel이 자동으로 재배포합니다.

---

## 🔧 트러블슈팅

| 문제 | 해결 |
|------|------|
| 제출 후 Notion에 안 나옴 | Vercel 환경 변수 확인 + Notion Connection 확인 |
| 빌드 실패 | Vercel Dashboard → Deployments → 로그 확인 |
| 모바일에서 깨짐 | 브라우저 캐시 삭제 후 재시도 |
| 레드플래그가 안 잡힘 | 데이터베이스에 Multi-select 속성 추가 확인 |

---

## 📞 문의

수면코치 김소정 | noct research
