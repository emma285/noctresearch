// app/api/submit/route.js
// Notion API 연동 + 자동 분석 (수면효율, Epworth, 레드플래그)
import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_DATABASE_ID;

// ─── 자동 분석 함수들 ───

// 시간 문자열 → 분으로 변환 (대략적)
function parseTimeToMinutes(str) {
  if (!str) return null;
  const clean = str.replace(/\s/g, "").toLowerCase();
  // "밤 11:30" "23:30" "오후 11시 30분" 등을 파싱
  let hours = 0, minutes = 0;
  const match1 = clean.match(/(\d{1,2}):?(\d{2})?/);
  if (match1) {
    hours = parseInt(match1[1]);
    minutes = match1[2] ? parseInt(match1[2]) : 0;
  }
  if (clean.includes("오후") || clean.includes("pm") || clean.includes("밤") || clean.includes("저녁")) {
    if (hours < 12) hours += 12;
  }
  return hours * 60 + minutes;
}

// 수면 효율 계산 (%)
function calcSleepEfficiency(data) {
  const bedTime = parseTimeToMinutes(data.wd_bed);
  const wakeTime = parseTimeToMinutes(data.wd_wake);
  const sleepOnset = parseTimeToMinutes(data.wd_sleep);

  if (!bedTime || !wakeTime || !sleepOnset) return null;

  let timeInBed = wakeTime - bedTime;
  if (timeInBed < 0) timeInBed += 24 * 60; // 자정 넘김

  let sleepTime = wakeTime - sleepOnset;
  if (sleepTime < 0) sleepTime += 24 * 60;

  // 중간 각성 시간 빼기 (대략)
  const wakings = parseInt(data.night_wakings) || 0;
  const backToSleep = parseInt(data.back_to_sleep) || 0;
  const wasteTime = wakings * backToSleep;

  const actualSleep = sleepTime - wasteTime;
  const efficiency = timeInBed > 0 ? Math.round((actualSleep / timeInBed) * 100) : null;

  return efficiency ? Math.max(0, Math.min(100, efficiency)) : null;
}

// Epworth 합산
function calcEpworth(data) {
  let total = 0;
  let answered = 0;
  for (let i = 0; i < 8; i++) {
    const val = data[`epworth_${i}`];
    if (val !== undefined && val !== null) {
      total += val;
      answered++;
    }
  }
  return answered >= 6 ? total : null; // 6개 이상 응답해야 유효
}

// 준비도 평균
function calcReadiness(data) {
  let total = 0, count = 0;
  for (let i = 0; i < 8; i++) {
    const val = data[`readiness_${i}`];
    if (val) { total += val; count++; }
  }
  return count > 0 ? (total / count).toFixed(1) : null;
}

// 사회적 시차 (Social Jet Lag)
function calcSocialJetLag(data) {
  const wdSleep = parseTimeToMinutes(data.wd_sleep);
  const wdWake = parseTimeToMinutes(data.wd_wake);
  const weSleep = parseTimeToMinutes(data.we_sleep);
  const weWake = parseTimeToMinutes(data.we_wake);

  if (!wdSleep || !wdWake || !weSleep || !weWake) return null;

  let wdMid = (wdSleep + wdWake) / 2;
  let weMid = (weSleep + weWake) / 2;
  if (wdWake < wdSleep) wdMid = ((wdSleep + wdWake + 1440) / 2) % 1440;
  if (weWake < weSleep) weMid = ((weSleep + weWake + 1440) / 2) % 1440;

  const diff = Math.abs(weMid - wdMid);
  return diff > 720 ? 1440 - diff : diff; // 분 단위
}

// 레드플래그 감지
function detectRedFlags(data) {
  const flags = [];

  // Epworth ≥ 11 → 과도한 주간 졸림
  const epworth = calcEpworth(data);
  if (epworth && epworth >= 11) flags.push(`Epworth ${epworth}/24 (과도한 주간 졸림)`);

  // 수면무호흡 의심
  const symptoms = [
    ...(data.symptoms_sleep || []),
    ...(data.symptoms_day || []),
  ];
  if (symptoms.includes("수면 중 호흡이 멈춘다고 들었다")) flags.push("수면무호흡 의심");
  if (symptoms.includes("감정이 격해질 때 갑자기 힘이 빠지는 느낌이 있다")) flags.push("탈력발작 의심 (기면증 스크리닝 필요)");
  if (symptoms.includes("부적절한 상황에서 잠든 적이 있다 (운전, 식사, 대화 중)")) flags.push("안전 리스크 — 부적절 수면 에피소드");
  if (symptoms.includes("잠들 때나 깰 때 몸이 마비된 느낌 (가위눌림)")) flags.push("수면마비 보고");
  if (symptoms.includes("다리가 불편하거나 저려서 잠들기 어렵다")) flags.push("하지불안 의심");

  // 진단 질환 중 수면 관련
  const diagnoses = data.diagnoses || [];
  if (diagnoses.includes("기면증")) flags.push("기면증 진단 이력");
  if (diagnoses.includes("수면무호흡증")) flags.push("수면무호흡 진단 이력");

  // 수면 효율 < 75%
  const se = calcSleepEfficiency(data);
  if (se && se < 75) flags.push(`수면 효율 ${se}% (75% 미만)`);

  // 수면 신념 고위험
  if (data.belief_catastrophe >= 4) flags.push("수면 파국적 사고 높음");
  if (data.belief_worry >= 4) flags.push("수면 불안 높음");

  return flags;
}

// ─── Notion Properties 구성 ───
// ─── 폼 옵션 → Notion 옵션명 매핑 ───
const WORK_MAP = {
  "주간 고정 근무": "주간 고정 근무",
  "교대 근무 / 시프트": "교대 근무",
  "야간 근무 / 밤샘 근무 있음": "야간/밤샘 근무",
  "재택근무 / 유연근무": "재택/유연근무",
  "비정규 스케줄 (프리랜서, 자영업 등)": "비정규 스케줄",
};
const STRESS_MAP = {
  "정신적 (집중, 의사결정, 감정노동 등)": "정신적",
  "육체적 (장시간 서있기, 체력 소모 등)": "육체적",
  "둘 다": "둘 다",
  "특별히 스트레스가 크지 않다": "크지 않다",
};
const DX_MAP = {
  "우울증 / 불안장애": "우울증/불안장애",
  "위장 질환 (역류성 식도염 등)": "위장 질환",
};
const PROBLEM_MAP = {
  "잠들기 어렵다": "잠들기 어렵다",
  "자다가 자주 깬다": "자다가 자주 깬다",
  "새벽에 너무 일찍 깬다": "새벽에 일찍 깬다",
  "충분히 자도 피곤하다 / 낮에 심하게 졸린다": "충분히 자도 피곤/졸림",
  "수면 중 특이 행동 (코골이, 이갈이, 잠꼬대 등)": "수면 중 특이 행동",
};
const MORNING_MAP = {
  "매우 멍함 / 기상이 힘들다": "매우 멍함",
  "약간 졸리지만 움직일 수 있다": "약간 졸림",
  "비교적 개운하다": "비교적 개운",
  "바로 활력이 있다": "바로 활력",
};
const REFERRAL_MAP = {
  "SNS / 콘텐츠": "SNS/콘텐츠",
};
const mapVal = (val, map) => map[val] || val;
const mapArr = (arr, map) => (arr || []).map(v => ({ name: map[v] || v }));

function buildNotionProperties(data) {
  const epworth = calcEpworth(data);
  const se = calcSleepEfficiency(data);
  const readiness = calcReadiness(data);
  const sjl = calcSocialJetLag(data);
  const redFlags = detectRedFlags(data);

  const props = {
    "이름": { title: [{ text: { content: data.name || "미입력" } }] },
    "생년월일": { rich_text: [{ text: { content: data.birthdate || "" } }] },
    "성별": { select: data.gender ? { name: data.gender } : null },
    "연락처": { phone_number: data.phone || null },
    "이메일": { email: data.email || null },
    "직업": { rich_text: [{ text: { content: data.job || "" } }] },
    "근무 형태": { multi_select: mapArr(data.work_type, WORK_MAP) },
    "스트레스 유형": { select: data.stress_type ? { name: mapVal(data.stress_type, STRESS_MAP) } : null },
    "진단 질환": { multi_select: mapArr(data.diagnoses, DX_MAP) },
    "수면검사 여부": { select: data.sleep_study ? { name: data.sleep_study } : null },
    "주요 수면 문제": { multi_select: mapArr(data.sleep_problems, PROBLEM_MAP) },
    "크로노타입": { select: data.chronotype ? { name: data.chronotype } : null },
    "Epworth 점수": { number: epworth },
    "수면 효율": { number: se },
    "준비도 평균": { number: readiness ? parseFloat(readiness) : null },
    "사회적 시차": { number: sjl },
    "레드플래그": { multi_select: redFlags.map(f => ({ name: f.substring(0, 100) })) },
    "레드플래그 수": { number: redFlags.length },
    "유입 경로": { select: data.referral ? { name: mapVal(data.referral, REFERRAL_MAP) } : null },
    "아침 컨디션": { select: data.morning_state ? { name: mapVal(data.morning_state, MORNING_MAP) } : null },
    "스트레스 수준": { select: data.stress_level ? { name: data.stress_level } : null },
    "작성일": { date: { start: new Date().toISOString().split("T")[0] } },
  };

  // null 값 제거
  Object.keys(props).forEach(k => {
    if (props[k] === null || props[k]?.select === null) delete props[k];
  });

  return props;
}

// 상세 내용은 페이지 본문(children blocks)으로
function buildNotionContent(data) {
  const blocks = [];
  const h2 = (text) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: text } }] } });
  const para = (text) => ({ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: text || "—" } }] } });
  const divider = () => ({ object: "block", type: "divider", divider: {} });

  // 자동 분석 요약
  blocks.push(h2("📊 자동 분석 요약"));
  const epworth = calcEpworth(data);
  const se = calcSleepEfficiency(data);
  const readiness = calcReadiness(data);
  const sjl = calcSocialJetLag(data);
  const flags = detectRedFlags(data);

  blocks.push(para(`수면 효율: ${se ? se + "%" : "계산 불가"} | Epworth: ${epworth !== null ? epworth + "/24" : "미완료"} | 준비도: ${readiness || "미완료"}/5 | 사회적 시차: ${sjl ? sjl + "분" : "계산 불가"}`));

  if (flags.length > 0) {
    blocks.push(para(`⚠️ 레드플래그: ${flags.join(" / ")}`));
  } else {
    blocks.push(para("✅ 특이 레드플래그 없음"));
  }

  blocks.push(divider());

  // 기본 정보
  blocks.push(h2("1. 기본 정보"));
  blocks.push(para(`키/체중: ${data.height || "—"}cm / ${data.weight || "—"}kg | 결혼: ${data.marriage || "—"} | 자녀: ${data.children || "—"} | 반려동물: ${data.pets || "—"} | 동거인: ${data.cohabitants || "—"}`));

  // 직업
  blocks.push(h2("2. 직업 및 근무"));
  blocks.push(para(`직업: ${data.job || "—"}`));
  blocks.push(para(`근무 시간/초과: ${data.work_hours || "—"} | 퇴근→수면: ${data.work_sleep_gap || "—"} | 밤샘 빈도: ${data.allnighter || "—"}`));

  // 약물
  blocks.push(h2("3. 약물"));
  blocks.push(para(data.medications || "없음"));

  // 수면 고민
  blocks.push(h2("4. 수면 고민 상세"));
  blocks.push(para(data.problem_detail || "—"));
  blocks.push(para(`시작 시기/계기: ${data.onset || "—"}`));
  blocks.push(para(`일상 영향: ${data.daily_impact || "—"}`));

  // 수면 스케줄
  blocks.push(h2("5. 수면 스케줄"));
  blocks.push(para(`[평일] 침대: ${data.wd_bed || "—"} → 소등: ${data.wd_lights || "—"} → 입면: ${data.wd_sleep || "—"} → 기상: ${data.wd_wake || "—"}`));
  blocks.push(para(`[주말] 침대: ${data.we_bed || "—"} → 입면: ${data.we_sleep || "—"} → 기상: ${data.we_wake || "—"}`));
  blocks.push(para(`야간 각성: ${data.night_wakings || "—"}회 | 재입면: ${data.back_to_sleep || "—"} | 총 수면: ${data.total_sleep || "—"} | 알람: ${data.alarm || "—"}`));
  blocks.push(para(`낮잠: ${data.nap || "—"} | 이상 취침: ${data.ideal_bed || "—"} / 기상: ${data.ideal_wake || "—"}`));

  // 생활 습관
  blocks.push(h2("10. 생활 습관"));
  blocks.push(para(`카페인: ${data.caffeine || "—"} | 음주: ${data.alcohol || "—"}`));
  blocks.push(para(`운동: ${data.exercise || "—"} | 햇빛: ${data.sunlight || "—"}`));
  blocks.push(para(`취침 전 활동: ${data.pre_bed || "—"} | 식사: ${data.meals || "—"}`));

  // 감정/스트레스
  blocks.push(h2("11. 스트레스/감정"));
  blocks.push(para(`스트레스: ${data.stress_level || "—"} | 우울/불안: ${data.mood || "—"} ${data.mood_detail ? "→ " + data.mood_detail : ""}`));

  // 꿈
  blocks.push(h2("12. 기상/꿈"));
  blocks.push(para(`아침 컨디션: ${data.morning_state || "—"} | 꿈 빈도: ${data.dream_freq || "—"} | 특징: ${data.dream_char || "—"}`));

  // 코칭 동기
  blocks.push(h2("13. 코칭 동기"));
  blocks.push(para(`유입: ${data.referral || "—"}`));
  blocks.push(para(`이유/기대: ${data.coaching_reason || "—"}`));
  blocks.push(para(`이전 시도: ${data.previous_attempts || "—"}`));

  // 수면 신념
  blocks.push(h2("9. 수면 신념"));
  blocks.push(para(`파국적 사고: ${data.belief_catastrophe || "—"}/5 | 수면 불안: ${data.belief_worry || "—"}/5 | 모니터링: ${data.belief_monitor || "—"}/5`));

  // ─── 설문 원본 (질문 + 답변 그대로) ───
  blocks.push(divider());
  blocks.push(h2("📋 설문 원본 응답"));

  const v = (k) => {
    const val = data[k];
    if (val === null || val === undefined || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };
  const timeStr = (k) => {
    const h = data[k + "_h"], m = data[k + "_m"];
    if (h === null || h === undefined) return "—";
    return `${h}시 ${m || "00"}분`;
  };

  // 1. 기본 정보
  blocks.push(h3("PART 1. 기본 정보"));
  blocks.push(para(`이름: ${v("name")}`));
  blocks.push(para(`태어난 연도: ${v("birth_year")}`));
  blocks.push(para(`성별: ${v("gender")}`));
  blocks.push(para(`연락처: ${v("phone")}`));
  blocks.push(para(`키: ${v("height")}cm / 체중: ${v("weight")}kg`));
  blocks.push(para(`결혼 여부: ${v("marriage")}`));
  blocks.push(para(`자녀: ${v("children")}${data.children_detail ? " → " + data.children_detail : ""}`));
  blocks.push(para(`반려동물: ${v("pets")}${data.pets_detail ? " → " + data.pets_detail : ""}`));
  blocks.push(para(`함께 사는 분: ${v("cohabitants")}`));

  // 2. 직업 및 근무
  blocks.push(h3("PART 2. 직업 및 근무 패턴"));
  blocks.push(para(`직업: ${v("job")}`));
  blocks.push(para(`근무 형태: ${v("work_type")}`));
  blocks.push(para(`하루 평균 근무 시간: ${v("work_hours")}`));
  blocks.push(para(`초과 근무 빈도: ${v("overtime")}`));
  blocks.push(para(`스트레스 유형: ${v("stress_type")}`));
  blocks.push(para(`퇴근 후 수면까지 여유: ${v("work_sleep_gap")}`));
  blocks.push(para(`밤샘 빈도: ${v("allnighter")}`));

  // 3. 건강
  blocks.push(h3("PART 3. 건강 및 의료 정보"));
  blocks.push(para(`진단 질환: ${v("diagnoses")}${data.diagnoses_other ? " + " + data.diagnoses_other : ""}`));
  blocks.push(para(`복용 약물: ${v("med")}`));
  blocks.push(para(`수면검사 여부: ${v("sleep_study")}${data.sleep_study_detail ? " → " + data.sleep_study_detail : ""}`));

  // 4. 수면 고민
  blocks.push(h3("PART 4. 현재 수면 고민"));
  blocks.push(para(`가장 힘든 수면 문제: ${v("sleep_problems")}${data.sleep_problems_other ? " + " + data.sleep_problems_other : ""}`));
  blocks.push(para(`상세 설명: ${v("problem_detail")}`));
  blocks.push(para(`시작 시기/계기: ${v("onset")}`));
  blocks.push(para(`일상 영향: ${v("daily_impact")}`));

  // 5. 수면 습관
  blocks.push(h3("PART 5. 평소 수면 습관"));
  blocks.push(para(`[평일] 침대에 눕는 시간: ${timeStr("wd_bed")}`));
  blocks.push(para(`[평일] 실제 잠드는 시간 (체감): ${timeStr("wd_sleep")}`));
  blocks.push(para(`[평일] 기상 시간: ${timeStr("wd_wake")}`));
  blocks.push(para(`[주말] 침대에 눕는 시간: ${timeStr("we_bed")}`));
  blocks.push(para(`[주말] 실제 잠드는 시간 (체감): ${timeStr("we_sleep")}`));
  blocks.push(para(`[주말] 기상 시간: ${timeStr("we_wake")}`));
  blocks.push(para(`밤에 깨는 횟수: ${v("night_wakings")}`));
  blocks.push(para(`다시 잠드는 데 걸리는 시간 (체감): ${v("back_to_sleep")}`));
  blocks.push(para(`하루 총 수면 시간 (체감): ${v("total_sleep")}`));
  blocks.push(para(`아침에 어떻게 일어나는지: ${v("alarm")}`));
  blocks.push(para(`낮잠: ${v("nap")}${data.nap_detail ? " → " + data.nap_detail : ""}`));
  blocks.push(para(`크로노타입: ${v("chronotype")}`));
  blocks.push(para(`희망 취침 시간: ${timeStr("ideal_bed")}`));
  blocks.push(para(`희망 기상 시간: ${timeStr("ideal_wake")}`));

  // 6. 수면 환경
  blocks.push(h3("PART 6. 수면 환경"));
  blocks.push(para(`거주 형태: ${v("housing")}`));
  blocks.push(para(`침실 온도: ${v("env_temp")}`));
  blocks.push(para(`침실 어두움: ${v("env_dark")}`));
  blocks.push(para(`침실 소음: ${v("env_noise")}`));
  blocks.push(para(`매트리스: ${v("env_mattress")}`));
  blocks.push(para(`같은 방 동침자: ${v("bed_partner")}`));
  blocks.push(para(`침실 TV: ${v("tv_bedroom")}`));
  blocks.push(para(`수면 보조 도구: ${v("sleep_aids")}`));

  // 7. Epworth
  blocks.push(h3("PART 7. 주간 졸림 평가 (Epworth)"));
  const epSits = ["앉아서 책을 읽을 때","TV를 볼 때","공공장소에서 가만히 앉아 있을 때","1시간 이상 차 탑승 시","오후에 누워서 쉴 때","대화 중 앉아 있을 때","점심 후 조용히 앉아 있을 때","운전 중 신호 대기 시"];
  const epLabels = ["전혀 졸지 않음","약간 졸 수 있음","종종 졸게 됨","거의 확실히 졸게 됨"];
  for (let i = 0; i < 8; i++) {
    const val = data[`epworth_${i}`] ?? data[`ep_${i}`];
    const label = val !== null && val !== undefined ? `${val} (${epLabels[val] || ""})` : "—";
    blocks.push(para(`${epSits[i]}: ${label}`));
  }
  blocks.push(para(`합계: ${epworth !== null ? epworth + "/24" : "미완료"}`));

  // 8. 증상
  blocks.push(h3("PART 8. 수면 관련 증상"));
  blocks.push(para(`잠들기/수면 유지 어려움: ${v("symptoms_onset")}${data.symptoms_onset_other ? " + " + data.symptoms_onset_other : ""}`));
  blocks.push(para(`수면 중 증상: ${v("symptoms_sleep")}${data.symptoms_sleep_other ? " + " + data.symptoms_sleep_other : ""}`));
  blocks.push(para(`주간 증상: ${v("symptoms_day")}${data.symptoms_day_other ? " + " + data.symptoms_day_other : ""}`));

  // 9. 수면 신념
  blocks.push(h3("PART 9. 수면에 대한 생각"));
  blocks.push(para(`"잠을 못 자면 다음 날 완전히 망한다": ${v("belief_catastrophe") || v("b1")}/5`));
  blocks.push(para(`"침대에 누우면 걱정부터 된다": ${v("belief_worry") || v("b2")}/5`));
  blocks.push(para(`"수면 분석앱 데이터를 자주 확인한다": ${v("belief_monitor") || v("b3")}/5`));

  // 10. 생활 습관
  blocks.push(h3("PART 10. 생활 습관"));
  blocks.push(para(`카페인: ${v("caffeine")}`));
  blocks.push(para(`음주: ${v("alcohol")}`));
  blocks.push(para(`운동: ${v("exercise")}`));
  blocks.push(para(`아침 햇빛: ${v("sunlight")}`));
  blocks.push(para(`취침 전 활동: ${v("pre_bed")}`));
  blocks.push(para(`식사 패턴: ${v("meals")}`));

  // 11. 스트레스
  blocks.push(h3("PART 11. 스트레스 및 감정"));
  blocks.push(para(`스트레스 수준: ${v("stress_level")}`));
  blocks.push(para(`우울/불안 지속 여부: ${v("mood")}${data.mood_detail ? " → " + data.mood_detail : ""}`));

  // 12. 기상/꿈
  blocks.push(h3("PART 12. 기상 후 상태 & 꿈"));
  blocks.push(para(`아침 30분 이내 컨디션: ${v("morning_state")}`));
  blocks.push(para(`꿈 기억 빈도: ${v("dream_freq")}`));
  blocks.push(para(`꿈의 특징: ${v("dream_char")}`));

  // 13. 코칭 동기
  blocks.push(h3("PART 13. 코칭 동기 및 기대"));
  blocks.push(para(`유입 경로: ${v("referral")}`));
  blocks.push(para(`코칭 이유/기대: ${v("coaching_reason")}`));
  blocks.push(para(`이전 시도/효과: ${v("previous_attempts") || v("prev_attempts")}`));

  // 14. 준비도
  blocks.push(h3("PART 14. 변화 준비도"));
  const rdItems = [
    "생활 습관을 바꿀 준비가 되어 있다",
    "전문가 지침을 따를 수 있다",
    "어려움이 있을 수 있음을 받아들인다",
    "삶의 질 향상을 기대한다",
    "장기적으로 노력을 지속할 의지가 있다",
    "수면 습관이 미치는 영향을 이해한다",
    "변화를 해야 한다는 생각이 든다",
    "목표와 계획을 세울 준비가 되어 있다",
  ];
  for (let i = 0; i < 8; i++) {
    const val = data[`readiness_${i}`] ?? data[`r_${i}`];
    if (val !== null && val !== undefined) {
      blocks.push(para(`${rdItems[i] || `항목 ${i+1}`}: ${val}/5`));
    }
  }

  return blocks;
}

// h3 헬퍼
function h3(text) {
  return {
    object: "block",
    type: "heading_3",
    heading_3: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

// ─── API Handler ───
export async function POST(request) {
  try {
    const data = await request.json();

    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      console.log("Notion API not configured. Data received:", JSON.stringify(data).substring(0, 200));
      return NextResponse.json({ success: true, message: "데이터 수신 완료 (Notion 미연동)" });
    }

    const properties = buildNotionProperties(data);
    const children = buildNotionContent(data);

    await notion.pages.create({
      parent: { database_id: DB_ID },
      properties,
      children: children.slice(0, 100), // Notion API 블록 제한
    });

    return NextResponse.json({ success: true, message: "Notion 저장 완료" });
  } catch (error) {
    console.error("Notion API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
