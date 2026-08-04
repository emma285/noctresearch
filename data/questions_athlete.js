// data/questions_athlete.js v2
// questions.js(v5)의 운동선수 파생본. 실제 선수 생활 기준으로 리뷰·개편.
// 변경점:
//   - 기본정보 슬림화: 결혼·자녀·반려동물·동거인 → 생활형태(합숙/자취/본가/가정) 1문항
//   - 섹션2 "직업 및 근무 패턴" → "운동선수 프로필"(A섹션): 종목·수준·경력·4부제 훈련시간·시즌·원정·부상·체중관리
//   - "수행·멘탈"(E섹션) 신규 (경기 전날/경기일 밤/멘탈)
//   - 수면습관: 평일→훈련일 (사회적시차를 선수 리듬으로)
//   - 수면환경: 환경 조절 가능 여부 + 합숙 제약(조건부) 추가
//   - ESS(Epworth)·DBAS(beliefs)·TTM(readiness) 표준척도 그대로 유지
// 분기 규약: showIf(data) => boolean. false면 문항 건너뜀. IntakeForm이 next/prev/진행률에서 스킵 처리 필요.
//   - 골프 분기(sport==="골프"): golf_teetime, golf_early_sleep
//   - 합숙 분기(living_type==="합숙·기숙사"): dorm_constraints

import { YEARS, HRS, MINS, hrLabel } from "./questions";
export { YEARS, HRS, MINS, hrLabel };

const isGolf = (d) => d.sport === "골프";
const isDorm = (d) => (d.living_type || []).includes("합숙·기숙사");

export const QUESTIONS = [
  { id: "w", type: "welcome" },
  // 1 — 기본 정보
  { id: "name", type: "text", sec: "기본 정보", sn: 1, title: "이름을 알려주세요", k: "name", ph: "이름 입력" },
  { id: "phone", type: "text", title: "연락처를 알려주세요", sub: "작성 내용은 자동 저장돼요. 안내·문의에 사용됩니다", k: "phone", ph: "010-0000-0000" },
  { id: "birth", type: "dropdown", title: "태어난 연도를 선택해 주세요", k: "birth_year", def: "2000년" },
  { id: "gender", type: "pills", title: "성별을 선택해 주세요", k: "gender", opts: ["남성", "여성", "기타"] },
  { id: "living", type: "multi", title: "요즘(최근 2주) 주로 어디서 지내나요?", sub: "왔다갔다 하면 해당하는 것 모두 선택해 주세요", k: "living_type", opts: ["합숙·기숙사", "자취·혼자 생활", "본가·가족과 함께", "배우자·자녀와 함께"] },

  // 2 — 운동선수 프로필 (A섹션, 기존 직업섹션 교체)
  { id: "sport", type: "pillsub", sec: "운동선수 프로필", sn: 2, title: "어떤 종목 선수신가요?", sub: "가장 주가 되는 종목 하나를 선택해 주세요", k: "sport", opts: ["골프", "축구/풋살", "야구", "농구", "배구", "육상/트랙", "수영", "사이클", "격투/투기", "테니스/라켓", "기타"], subOn: ["기타"], subL: "종목을 직접 입력해 주세요", subPh: "예: 스피드스케이팅" },
  { id: "level", type: "pills", title: "현재 경기 수준은 어디에 가까운가요?", k: "athlete_level", opts: ["프로/실업팀", "세미프로/대학팀", "아마추어 상위(엘리트·국가대표)", "생활체육/취미 상급"] },
  { id: "career", type: "pills", title: "선수 경력은 얼마나 되나요?", sub: "선수로 본격적으로 운동을 시작한 때부터 기준이에요", k: "athlete_career", opts: ["3년 미만", "3~7년", "7~10년", "10년 이상"] },
  { id: "traind", type: "pills", title: "주당 훈련 일수는?", k: "train_days", opts: ["주 1~2일", "주 3~4일", "주 5~6일", "매일", "하루 2회 이상"] },
  { id: "traint", type: "multi", title: "주로 훈련하는 시간대는?", sub: "해당하는 항목을 모두 선택해 주세요", k: "train_time", opts: ["새벽 (6~8시)", "오전 (9~12시)", "오후 (2~6시)", "야간 (저녁 식사 후, 7~10시)", "불규칙"] },
  { id: "season", type: "pills", title: "지금은 시즌의 어느 시기인가요?", k: "season_phase", opts: ["시즌 중 (경기 진행)", "시즌 직전 (대회 임박)", "비시즌/훈련기", "부상 재활 중", "휴식기"] },
  { id: "travel", type: "pills", title: "원정·이동은 얼마나 잦은가요?", k: "travel_freq", opts: ["거의 없음", "월 1~2회", "주 1회 이상", "장기 원정·합숙이 잦음"] },
  { id: "jetlag", type: "pills", title: "해외 원정처럼\n시차가 있는 이동이 있나요?", k: "jetlag", opts: ["없음", "가끔 있음", "자주 있음 (시차 적응이 힘듦)"] },
  { id: "travelsl", type: "pills", title: "원정·낯선 곳에서 잘 때\n수면은 어떤가요?", k: "travel_sleep", opts: ["평소와 비슷하다", "첫날만 설친다", "원정 내내 잘 못 잔다", "원정이 거의 없다"] },
  { id: "injury", type: "pillsub", title: "현재 부상이나 통증이 있나요?", k: "injury", opts: ["없음", "있음"], subOn: ["있음"], subL: "부위와 상태를 알려주세요", subPh: "예: 오른쪽 어깨 회전근개, 통증으로 밤에 자주 깸", subRows: 2 },
  { id: "weight", type: "pills", title: "요즘 체중 관리를 하고 있나요?", k: "weight_mgmt", opts: ["감량 중", "증량 중", "유지 중"] },
  // 골프 분기 (sport === "골프") — '이른 티오프 → 새벽 기상 압박' 축만. 긴장 축은 E섹션 precomp가 담당.
  { id: "golf_tee", type: "pills", showIf: isGolf, title: "라운드(연습·대회 포함)가 잡히면\n보통 티오프 시간은 몇 시인가요?", sub: "티오프 = 그날 첫 홀 시작 시각이에요", k: "golf_teetime", opts: ["이른 아침 (6~8시)", "오전 (8~10시)", "오전 늦게~오후", "매번 다르다"] },
  { id: "golf_early", type: "pills", showIf: isGolf, title: "이른 티오프가 잡힌 날,\n새벽에 일어나야 하는 압박이\n수면에 지장을 주나요?", sub: "긴장 때문이 아니라 '일찍 일어나야 해서' 겪는 어려움이에요", k: "golf_early_sleep", opts: ["별로 없다", "전날 일찍 억지로 누워도 잠이 안 온다", "알람을 놓칠까 봐 자주 깬다", "둘 다 겪는다"] },

  // 3 — 건강 및 의료 정보
  { id: "dx", type: "multi", sec: "건강 및 의료 정보", sn: 3, title: "현재 진단받은 질환이 있나요?", sub: "해당하는 항목을 모두 선택해 주세요", k: "diagnoses", opts: ["없음", "고혈압", "심장 질환", "당뇨", "갑상선 질환", "호르몬 관련 질환 (생리불순 등)", "수면무호흡증", "기면증", "하지불안증후군", "우울증/불안장애", "위장 질환", "만성 통증"], hasOther: true },
  { id: "med", type: "ta", title: "현재 복용 중인 약물을 알려주세요", sub: "처방약, 일반약, 영양제, 부스터 모두 포함해 주세요", k: "med", ph: "예: 소염진통제(훈련 후), 오메가3, 단백질 보충제\n없으면 '없음'" },
  { id: "ss", type: "pillsub", title: "수면검사를 받은 적이 있나요?", sub: "수면다원검사(PSG) 등", k: "sleep_study", opts: ["없음", "있음"], subOn: ["있음"], subL: "검사 시기와 결과를 알려주세요", subPh: "예: 2023년, 서울대병원, 수면무호흡 진단", subRows: 3 },

  // 4 — 현재 수면 고민
  { id: "sp", type: "multi", sec: "현재 수면 고민", sn: 4, title: "현재 가장 힘든 수면 문제는?", sub: "해당하는 항목을 모두 선택해 주세요", k: "sleep_problems", opts: ["잠들기 어렵다", "자다가 자주 깬다", "새벽에 너무 일찍 깬다", "충분히 자도 피곤하다", "낮에 심하게 졸린다", "수면 중 특이 행동 (코골이 등)"], hasOther: true },
  { id: "pd", type: "ta", title: "수면 문제를 좀 더 자세히 알려주세요", sub: "낮과 밤 모두 포함해서 자유롭게 적어주세요", k: "problem_detail", ph: "예: 새벽 3시쯤 꼭 한 번 깨고..." },
  { id: "onset", type: "ta", title: "이 수면 문제는 언제부터 시작되었나요?", sub: "시작 시기와 계기가 있다면 알려주세요", k: "onset", ph: "예: 작년 시즌 부상 이후 / 소속팀 이적 후" },
  { id: "imp", type: "ta", title: "수면 문제가 훈련·경기력과\n일상에 어떤 영향을 미치나요?", k: "daily_impact", ph: "예: 훈련 집중력 저하 / 경기 당일 컨디션 난조" },

  // 5 — 평소 수면 습관 (사회적시차 = 평일/주말 timegroup, 유지)
  { id: "wd", type: "timegroup", sec: "평소 수면 습관", sn: 5, title: "훈련일 수면 시간을 알려주세요", sub: "최근 2주 훈련하는 날 기준으로 선택해 주세요", fields: [{ k: "wd_bed", label: "침대에 눕는 시간" }, { k: "wd_sleep", label: "실제 잠드는 시간 (체감)" }, { k: "wd_wake", label: "기상 시간" }] },
  { id: "we", type: "timegroup", title: "휴식일(비훈련일) 수면 시간을 알려주세요", sub: "최근 2주를 기준으로 선택해 주세요", fields: [{ k: "we_bed", label: "침대에 눕는 시간" }, { k: "we_sleep", label: "실제 잠드는 시간 (체감)" }, { k: "we_wake", label: "기상 시간" }] },
  { id: "nw", type: "pills", title: "밤에 보통 몇 번 깨시나요?", k: "night_wakings", opts: ["0회 (안 깸)", "1회", "2회", "3회", "4회 이상"] },
  { id: "bts", type: "pills", title: "깨면 다시 잠드는 데\n얼마나 걸리나요? (체감)", k: "back_to_sleep", opts: ["바로 잠듦", "5~10분", "10~20분", "20~30분", "30분~1시간", "1시간 이상", "다시 못 잠"] },
  { id: "ts", type: "pills", title: "하루 총 수면 시간은\n대략 얼마인가요? (체감)", sub: "낮잠을 제외한 밤에 자는 시간 기준이에요", k: "total_sleep", opts: ["4시간 미만", "4~5시간", "5~6시간", "6~7시간", "7~8시간", "8~9시간", "9시간 이상"] },
  { id: "alarm", type: "pills", title: "아침에 어떻게 일어나시나요?", sub: "주로 해당하는 방식을 선택해 주세요", k: "alarm", opts: ["알람으로 바로 일어남", "알람 듣고도 잘 못 일어남", "알람을 여러 번 미루고 일어남", "알람 없이 자연스럽게 깸", "알람 쓰지만 그 전에 깸"] },
  { id: "nap", type: "pillsub", title: "평소에 낮잠을 주무시나요?", sub: "훈련 사이 회복 낮잠도 포함해 주세요", k: "nap", opts: ["안 잔다", "가끔", "주 1~2회", "주 3~4회", "거의 매일"], subOn: ["가끔", "주 1~2회", "주 3~4회", "거의 매일"], subL: "낮잠 시간대와 길이를 알려주세요", subPh: "예: 오후 훈련 전 1시, 30분" },
  { id: "chrono", type: "pills", title: "아침형인가요, 저녁형인가요?", k: "chronotype", opts: ["확실한 아침형", "약간 아침형", "중간", "약간 저녁형", "확실한 저녁형", "잘 모르겠다"] },
  { id: "ideal", type: "timegroup", title: "아무 제약이 없다면\n몇 시에 자고 일어나고 싶으세요?", sub: "실제 스케줄이 아닌, 몸이 원하는 자연스러운 수면 시간이에요.\n크로노타입(생체시계 성향) 파악에 참고됩니다.", fields: [{ k: "ideal_bed", label: "희망 취침 시간" }, { k: "ideal_wake", label: "희망 기상 시간" }] },

  // 6 — 수면 환경
  { id: "envctrl", type: "pills", sec: "수면 환경", sn: 6, title: "지금 자는 공간의 환경(온도·조명·소음)을\n본인이 조절할 수 있나요?", k: "env_control", opts: ["대부분 조절할 수 있다", "일부만 조절할 수 있다", "거의 조절하기 어렵다"] },
  { id: "dorm", type: "multi", showIf: isDorm, title: "합숙·기숙사 생활에서\n수면에 걸리는 점이 있나요?", sub: "해당하는 항목을 모두 선택해 주세요", k: "dorm_constraints", opts: ["소등·기상 시간이 정해져 있다", "룸메이트 때문에 방해받는다", "방이 밝거나 시끄럽다", "규율상 낮잠·개인 루틴이 어렵다", "특별히 없다"] },
  { id: "etemp", type: "pills", title: "침실 온도는 어떤 편인가요?", sub: "계절보다 '잘 때 몸이 느끼는 정도'로 골라 주세요", k: "env_temp", opts: ["서늘하고 시원한 편", "적당하고 쾌적한 편", "덥거나 후텁지근한 편", "계절 따라 편차가 큰 편", "잘 모르겠다"] },
  { id: "edark", type: "pills", title: "침실은 얼마나 어두운가요?", k: "env_dark", opts: ["매우 어두움", "보통", "밝은 편"] },
  { id: "enoise", type: "pills", title: "침실 소음 수준은?", k: "env_noise", opts: ["조용", "보통", "시끄러움"] },
  { id: "ematt", type: "pills", title: "매트리스 느낌은?", k: "env_mattress", opts: ["딱딱한 편", "보통", "부드러운 편"] },
  { id: "epart", type: "multi", title: "같은 방에서 함께 자는 사람이 있나요?", sub: "여러 곳에서 지내면 해당하는 것 모두 선택해 주세요", k: "bed_partner", opts: ["없음 (혼자 잠)", "배우자/파트너", "팀 동료·룸메이트", "자녀", "기타"] },
  { id: "etv", type: "pills", title: "침실에 TV가 있나요?", k: "tv_bedroom", opts: ["없음", "있고 보면서 잠듦", "있지만 안 봄"] },
  { id: "eaid", type: "text", title: "수면 보조 도구를 사용하시나요?", k: "sleep_aids", ph: "예: 귀마개, 안대, 백색소음 앱" },

  // 7 — 주간 졸림 평가 (ESS, 유지)
  { id: "ep", type: "epworth", sec: "주간 졸림 평가", sn: 7, title: "아래 상황에서 실제로 졸거나\n잠들 가능성이 얼마나 되나요?", sub: "단순한 피로감이 아니라, 진짜 졸음이 올 가능성을 떠올려 주세요.", sits: ["앉아서 책을 읽을 때", "TV를 볼 때", "공공장소에서 가만히 앉아 있을 때", "1시간 이상 차 탑승 시", "오후에 누워서 쉴 때", "대화 중 앉아 있을 때", "점심 후 조용히 앉아 있을 때", "운전 중 신호 대기 시"], sLbl: ["전혀 졸지\n않음", "약간 졸\n수 있음", "종종\n졸게 됨", "거의 확실히\n졸게 됨"] },

  // 8 — 수면 관련 증상
  { id: "s1", type: "multi", sec: "수면 관련 증상", sn: 8, title: "잠들거나 수면을 유지할 때\n겪는 어려움이 있나요?", sub: "해당하는 항목을 모두 선택해 주세요", k: "symptoms_onset", opts: ["잠들려면 생각이 많아지거나 불안해진다", "통증/불편감 때문에 잠들기 어렵다", "다리가 불편하거나 저려서 잠들기 어렵다", "낯선 곳에서 오히려 더 잘 잔다"], hasOther: true },
  { id: "s2", type: "multi", title: "수면 중에 나타나는 증상이 있나요?", sub: "본인이 느끼거나, 주변에서 들은 것 모두 포함", k: "symptoms_sleep", opts: ["본인이 코를 심하게 곤다고 느낀다", "다른 사람이 코골이가 심하다고 말한다", "수면 중 호흡이 멈춘다고 들었다", "가위눌림 (수면마비)", "수면 중 특이 행동을 한다고 들었다"], hasOther: true, otherPh: "그 외 수면 중 증상" },

  // 9 — 수면에 대한 생각 (DBAS, 유지)
  { id: "bl", type: "beliefs", sec: "수면에 대한 생각", sn: 9, title: "아래 문장이 본인에게\n얼마나 해당되나요?", items: [{ k: "b1", t: "잠을 못 자면 다음 날 훈련·경기를 완전히 망친다고 느낀다" }, { k: "b2", t: "침대에 누우면 '오늘 잘 수 있을까' 걱정부터 된다" }, { k: "b3", t: "수면 시간이나 웨어러블·수면 분석앱 데이터를 자주 확인한다" }], scale: ["전혀\n아니다", "별로\n아니다", "보통", "그렇다", "매우\n그렇다"] },

  // 10 — 생활 습관
  { id: "caf", type: "text", sec: "생활 습관", sn: 10, title: "카페인 섭취량과 마지막 섭취 시간은?", sub: "커피, 차, 에너지 음료, 카페인 부스터 모두 포함", k: "caffeine", ph: "예: 하루 커피 2잔 + 훈련 전 부스터, 마지막 오후 4시" },
  { id: "alc", type: "text", title: "음주 빈도와 양은?", k: "alcohol", ph: "예: 주 2회, 맥주 1~2캔 / 안 마심" },
  { id: "ex", type: "text", title: "훈련 외에 따로 하는 운동이 있나요?", sub: "보강·유산소 등. 종류와 시간대를 알려주세요", k: "exercise", ph: "예: 저녁 웨이트 보강 주 2회 / 없음" },
  { id: "sun", type: "pills", title: "아침 기상 후 30분 이내에\n햇빛을 보시나요?", k: "sunlight", opts: ["거의 매일", "가끔", "거의 안 함"] },
  { id: "pb", type: "text", title: "취침 전이나 침대에서\n주로 하는 활동은?", k: "pre_bed", ph: "예: 스마트폰 40분 → 스트레칭 10분" },
  { id: "ml", type: "text", title: "식사 패턴을 알려주세요", sub: "대략적인 시간, 야식, 훈련 전후 보충 여부", k: "meals", ph: "예: 아침 7시 / 점심 12시 / 저녁 7시 + 훈련 후 보충식" },

  // 11 — 스트레스 및 감정
  { id: "slv", type: "pills", sec: "스트레스 및 감정", sn: 11, title: "요즘 전반적인 스트레스 수준은?", sub: "운동 외 생활 스트레스도 포함", k: "stress_level", opts: ["매우 낮음", "낮음", "보통", "높음", "매우 높음"] },
  { id: "mood", type: "pillsub", title: "최근 우울하거나 불안한 상태가\n지속되고 있나요?", k: "mood", opts: ["아니오", "예"], subOn: ["예"], subL: "어떤 상태가 얼마나 이어지고 있나요?", subPh: "예: 2주째 의욕이 없고 무기력하다 / 잠들기 전 불안이 심하다", subRows: 2 },

  // 12 — 수행·멘탈 (E섹션, 신규)
  { id: "perf", type: "pills", sec: "수행·멘탈", sn: 12, title: "수면과 경기력의 연관을\n얼마나 체감하나요?", sub: "잘 잔 날과 못 잔 날의 차이를 떠올려 주세요", k: "perf_link", opts: ["강하게 느낀다", "어느 정도 느낀다", "잘 모르겠다", "별로 느끼지 않는다"] },
  { id: "precomp", type: "pills", title: "중요한 경기·대회 전날 밤,\n잠은 어떤가요?", sub: "긴장·설렘 때문에 잠들기 어려운지 떠올려 주세요", k: "precomp_sleep", opts: ["평소와 비슷하게 잔다", "얕게 설친다", "거의 못 잔다", "경기 며칠 전부터 못 잔다"] },
  { id: "postgame", type: "pills", title: "경기·시합이 있는 날 밤,\n잠은 어떤가요?", sub: "야간경기 등 늦게 끝나는 경우도 떠올려 주세요", k: "postgame_arousal", opts: ["평소와 비슷하다", "경기가 늦게 끝나 잠자리가 밀린다", "몸·머리가 들떠 잘 못 잔다", "둘 다 겪는다", "해당 없음 (개인종목 등)"] },
  { id: "postgamed", type: "ta", title: "경기·훈련 후 잠들기까지\n어떤 상태인지 알려주세요", sub: "몸·머릿속에서 어떤 일이 일어나는지 자유롭게", k: "postgame_detail", ph: "예: 몸은 지쳤는데 머리가 계속 돌아가고, 새벽 2~3시까지 뒤척임" },
  { id: "mental", type: "multi", title: "밤에 잠들 무렵,\n다음 중 겪는 것이 있나요?", sub: "해당하는 항목을 모두 선택해 주세요", k: "mental_state", opts: ["다음 경기·훈련이 걱정돼 생각이 계속된다", "이미 끝난 경기·실수를 곱씹는다", "성적·결과에 대한 긴장·불안이 밤까지 이어진다", "몸이 들뜨거나 긴장이 안 풀린다", "해당 없음"], hasOther: true, otherPh: "그 외 상태" },

  // 13 — 기상 후 상태 & 꿈
  { id: "morn", type: "pills", sec: "기상 후 상태 & 꿈", sn: 13, title: "아침에 눈 뜨고 30분 이내\n컨디션은 어떤가요?", k: "morning_state", opts: ["매우 멍함", "약간 졸림", "비교적 개운", "바로 활력"], desc: ["기상이 너무 힘들다", "움직일 수는 있다", "나쁘지 않다", "바로 훈련 가능"] },
  { id: "drf", type: "pills", title: "꿈을 얼마나 자주 기억하나요?", k: "dream_freq", opts: ["거의 매일", "주 2~3회", "가끔", "거의 기억 안 남"] },
  { id: "drc", type: "text", optional: true, title: "꿈의 특징이 있다면 알려주세요", k: "dream_char", ph: "예: 매우 생생함, 경기 관련 악몽이 잦음" },

  // 14 — 코칭 동기 및 기대
  { id: "ref", type: "pills", sec: "코칭 동기 및 기대", sn: 14, title: "수면 코칭을 알게 된 경로는?", k: "referral", opts: ["직접 검색", "지인·동료 추천", "지도자·트레이너 연계", "병원/전문가 연계", "SNS/콘텐츠", "기타"] },
  { id: "cr", type: "ta", title: "코칭을 받으려는 가장 큰 이유와\n기대하는 변화는 무엇인가요?", k: "coaching_reason", ph: "예: 경기 전날 잘 자고 컨디션을 안정적으로 만들고 싶어요" },
  { id: "pa", type: "ta", title: "수면 개선을 위해 시도해본 것과\n효과는 어떠했나요?", k: "prev_attempts", ph: "예: 수면제(의존 걱정) / 멜라토닌 / 명상 앱(안 맞음)" },

  // 15 — 변화 준비도 (TTM, 유지)
  { id: "rd", type: "readiness", sec: "변화 준비도", sn: 15, title: "아래 문장이 본인에게\n얼마나 해당되나요?", sub: "1: 전혀 아니다 ~ 5: 매우 그렇다", items: ["수면 문제를 해결하기 위해 생활 습관을 바꿀 준비가 되어 있다", "전문가의 도움이 있다면 그 지침을 따를 수 있다고 생각한다", "새로운 습관을 시도할 때 어려움이 있을 수 있음을 받아들인다", "수면이 개선되면 훈련·경기력이 나아질 거라 기대한다", "장기적으로 꾸준히 노력할 의지가 있다"] },

  // 16 — 마지막 한마디
  { id: "etc", type: "ta", optional: true, sec: "마지막 한마디", sn: 16, title: "마지막으로 참고했으면 하는 내용이나\n하고 싶은 이야기가 있으면 남겨주세요", sub: "수면 외 건강 고민, 훈련·소속 여건, 코칭에 바라는 점 등\n무엇이든 괜찮아요.", k: "additional_notes", ph: "예: 원정 경기가 잦아 시차 적응이 어렵습니다 / 특별히 없습니다" },
  { id: "done", type: "complete" },
];
