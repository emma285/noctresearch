# 리포트 감사 게이트 (data ↔ 해석 정합)

수면 리포트의 숫자·라벨·인과문장이 원본 데이터와 어긋나지 않게 강제하는 시스템.
계기: 이지수 3차 리포트에서 "1시간+ 특이일 = 술자리·양압기 이탈"이라고 썼는데,
실제 그 이틀은 미국 체류기(시차)와 겹쳤고, 원본상 술·양압기 이탈한 날은 오히려 안 깬 날이었다.

## 불변식 (한 줄)

> 리포트의 모든 사실 주장은 원본 행에서 계산하거나 인용한다.
> 특히 특이점의 원인은 **그 날 메모/플래그에서만** 읽는다. 구간 인상으로 추론 금지.

## 5레이어

1. **입력 스냅샷 동결** — 리포트 생성에 쓴 원본을 `<report>.snapshot.json`으로 옆에 저장. 리포트는 이 스냅샷에서만 생성.
2. **데이터바인딩 렌더** — 차트 값 하드코딩 금지. 막대/점 하나가 원본 행을 물고 있어야 함.
3. **클레임-근거 바인딩** — 패턴 문장은 근거 날짜를 달고 나옴(`<report>.claims.json`).
4. **특이점 규칙** — 강조 특이일은 그 행에 join, 그날 메모 인용. 없으면 "원인 미상".
5. **발행 전 감사 게이트** — `audit-report.mjs`가 위를 자동 검사. FAIL이면 발행 중단.

## 사용

```bash
node report-audit/audit-report.mjs \
  report-assets/<report>.snapshot.json \
  report-assets/<report>.claims.json
```

## snapshot.json 스키마

```jsonc
{
  "client": "jisoo",
  "source": "구글시트 수면일지 export",       // 출처
  "capturedAt": "2026-09-07",                 // 언제 뜬 데이터인지
  "period": { "start": "2026-08-04", "end": "2026-09-07" },
  "nights": [
    {
      "date": "2026-08-08",     // 기상일 기준
      "location": "US",         // KR | US ... (시차/여행 판별용)
      "bedtime": "01:00",
      "waketime": "07:20",
      "awakeBucket": "10분 이하",// 원본 그대로: 안깸|10분 이하|10~30분|30분~1시간|1시간 이상
      "awakeMin": 0,            // 수치화(있으면). 없으면 생략
      "wakeCount": 0,
      "alcohol": true,          // 명시 안 됐으면 null(미상). false로 지어내지 말 것
      "cpap": "none",           // worn | removed | none | null(미상)
      "memo": "양압기 하지 않고 잤네요. 후배와 맥주 2잔."
    }
  ]
}
```

규칙: 모르는 값은 `null`(미상). 임의로 false/0 채우지 않는다.

## claims.json 스키마

```jsonc
{
  "report": "jisoo-summer",
  "generatedAt": "2026-09-07",
  "period": { "start": "2026-08-04", "end": "2026-09-07" },
  "claims": [
    {
      "id": "awakenings-cause",
      "text": "주황색 특이일은 술자리·양압기 이탈과 겹친 날이에요.",
      "type": "fact",                 // fact | interpretation | hypothesis
      "kind": "anomaly_cause",        // 특이점 원인 주장이면 → 강한 검사 발동
      "anomaly": { "bucket": "1시간 이상" },   // 또는 {"minAwake":60} / {"field":"wakeCount","op":">=","value":3}
      "cause": { "or_alcohol": true, "or_cpap": "removed" }, // or_* = 하나만 맞아도 성립
      "evidenceDates": ["2026-08-22", "2026-08-24"]          // 그 특이일들의 실제 날짜
    },
    {
      "id": "sep-consistency",
      "text": "귀국 후 9월엔 취침 변동폭 46분으로 가장 일정",
      "type": "fact",
      "expect": { "field": "bedtimeMin", "agg": "sd", "op": "<", "value": 50, "dates": ["..."] }
    },
    {
      "id": "alcohol-sleep",
      "text": "생각 많을 때 술로 잠들려는 시도 → 수면 질 저하",
      "type": "interpretation"        // 세션 근거(16차). 데이터 강제 안 함, 단 사실 단정은 금지
    }
  ]
}
```

## 검사 항목

- **커버리지**: 스냅샷이 리포트 기간 전체를 덮는가 (안 덮으면 재검증 불가 → FAIL)
- **근거 존재**: 모든 `evidenceDates`가 스냅샷에 있는가
- **숫자 재계산**: `expect`가 스냅샷에서 실제로 계산되는가 (mean/sum/max/min/sd)
- **특이점 원인**(핵심): 근거 날짜가 실제 특이일인가 + 그날 원인(cause)이 성립하는가 + 언급 안 된 실제 특이일은 없는가
- **가설 톤**: `hypothesis`는 사실 단정 금지 경고

FAIL 0이어야 발행. WARN은 검토 권고.
