// data/questions.js v5

export const YEARS = Array.from({ length: 70 }, (_, i) => `${2007 - i}년`);
export const HRS = Array.from({ length: 24 }, (_, i) => i);
export const MINS = ["00", "30"];

export function hrLabel(h) {
  if (h === 0) return "0시 (자정)";
  if (h < 6) return `${h}시 (새벽)`;
  if (h < 12) return `${h}시 (오전)`;
  if (h === 12) return "12시 (정오)";
  if (h < 18) return `${h}시 (오후)`;
  return `${h}시 (저녁)`;
}

export const QUESTIONS = [
  { id: "w", type: "welcome" },
  // 1
  { id: "name", type: "text", sec: "기본 정보", sn: 1, title: "이름을 알려주세요", k: "name", ph: "이름 입력" },
  { id: "birth", type: "dropdown", title: "태어난 연도를 선택해 주세요", k: "birth_year", def: "1990년" },
  { id: "gender", type: "pills", title: "성별을 선택해 주세요", k: "gender", opts: ["남성", "여성", "기타"] },
  { id: "phone", type: "text", title: "연락처를 알려주세요", k: "phone", ph: "010-0000-0000" },
  { id: "body", type: "body", title: "신체 정보를 알려주세요" },
  { id: "marriage", type: "pills", title: "결혼 여부를 알려주세요", k: "marriage", opts: ["미혼", "기혼", "이혼/사별", "기타"] },
  { id: "children", type: "pillsub", title: "자녀가 있으신가요?", k: "children", opts: ["없음", "1명", "2명", "3명 이상"], subOn: ["1명", "2명", "3명 이상"], subL: "자녀 나이", subPh: "예: 3살, 7살" },
  { id: "pets", type: "pillsub", title: "반려동물이 있으신가요?", k: "pets", opts: ["없음", "있음"], subOn: ["있음"], subL: "어떤 반려동물인가요?", subPh: "예: 강아지 (소형견)" },
  { id: "cohab", type: "multi", title: "함께 사는 분이 있으신가요?", sub: "해당하는 항목을 모두 선택해 주세요", k: "cohabitants", opts: ["혼자 살아요", "배우자·파트너", "부모님", "자녀", "형제·자매", "룸메이트", "기타"] },
  // 2
  { id: "job", type: "ta", sec: "직업 및 근무 패턴", sn: 2, title: "직업을 알려주세요", sub: "구체적인 업무 내용도 포함해 주세요", k: "job", ph: "예: 마케팅 기획 / 간호사(3교대)" },
  { id: "wtype", type: "multi", title: "근무 형태를 선택해 주세요", k: "work_type", opts: ["주간 고정 근무", "교대 근무", "야간/밤샘 근무", "재택/유연근무", "비정규 스케줄"] },
  { id: "whrs", type: "pills", title: "하루 평균 근무 시간은?", k: "work_hours", opts: ["6시간 미만", "6~8시간", "8~10시간", "10~12시간", "12시간 이상"] },
  { id: "ot", type: "pills", title: "초과 근무는 얼마나 자주 하시나요?", k: "overtime", opts: ["거의 없다", "월 1~2회", "주 1~2회", "거의 매일"] },
  { id: "stype", type: "pills", title: "업무 중 주로 받는 스트레스 유형은?", k: "stress_type", opts: ["정신적", "육체적", "둘 다", "크지 않다"], desc: ["집중, 의사결정, 감정노동 등", "장시간 서있기, 체력 소모 등", "", ""] },
  { id: "wgap", type: "pills", title: "퇴근 후 수면까지 보통\n몇 시간 여유가 있나요?", k: "work_sleep_gap", opts: ["1시간 미만", "1~2시간", "2~3시간", "3~4시간", "4시간 이상"] },
  { id: "an", type: "pills", title: "업무로 수면을 줄이거나\n밤샘한 빈도는?", k: "allnighter", opts: ["거의 없다", "월 1~2회", "주 1~2회", "거의 매일"] },
  // 3
  { id: "dx", type: "multi", sec: "건강 및 의료 정보", sn: 3, title: "현재 진단받은 질환이 있나요?", sub: "해당하는 항목을 모두 선택해 주세요", k: "diagnoses", opts: ["없음", "고혈압", "심장 질환", "당뇨", "갑상선 질환", "수면무호흡증", "기면증", "하지불안증후군", "우울증/불안장애", "위장 질환", "만성 통증"], hasOther: true },
  { id: "med", type: "ta", title: "현재 복용 중인 약물을 알려주세요", sub: "처방약, 일반약, 영양제 모두 포함해 주세요", k: "med", ph: "예: 혈압약(아침), 오메가3\n없으면 '없음'" },
  { id: "ss", type: "pillsub", title: "수면검사를 받은 적이 있나요?", sub: "수면다원검사(PSG) 등", k: "sleep_study", opts: ["없음", "있음"], subOn: ["있음"], subL: "검사 시기와 결과를 알려주세요", subPh: "예: 2023년, 서울대병원, 수면무호흡 진단", subRows: 3 },
  // 4
  { id: "sp", type: "multi", sec: "현재 수면 고민", sn: 4, title: "현재 가장 힘든 수면 문제는?", sub: "해당하는 항목을 모두 선택해 주세요", k: "sleep_problems", opts: ["잠들기 어렵다", "자다가 자주 깬다", "새벽에 너무 일찍 깬다", "충분히 자도 피곤하다", "낮에 심하게 졸린다", "수면 중 특이 행동 (코골이 등)"], hasOther: true },
  { id: "pd", type: "ta", title: "수면 문제를 좀 더 자세히 알려주세요", sub: "낮과 밤 모두 포함해서 자유롭게 적어주세요", k: "problem_detail", ph: "예: 새벽 3시쯤 꼭 한 번 깨고..." },
  { id: "onset", type: "ta", title: "이 수면 문제는 언제부터 시작되었나요?", sub: "시작 시기와 계기가 있다면 알려주세요", k: "onset", ph: "예: 작년 이직 후 / 출산 이후" },
  { id: "imp", type: "ta", title: "수면 문제가 일상생활에\n어떤 영향을 미치나요?", k: "daily_impact", ph: "예: 집중력 저하 / 감정 조절 어려움" },
  // 5 - grouped
  { id: "wd", type: "timegroup", sec: "평소 수면 습관", sn: 5, title: "평일 수면 시간을 알려주세요", sub: "최근 2주를 기준으로 선택해 주세요", fields: [{ k: "wd_bed", label: "침대에 눕는 시간" }, { k: "wd_sleep", label: "실제 잠드는 시간 (체감)" }, { k: "wd_wake", label: "기상 시간" }] },
  { id: "we", type: "timegroup", title: "주말 수면 시간을 알려주세요", sub: "최근 2주를 기준으로 선택해 주세요", fields: [{ k: "we_bed", label: "침대에 눕는 시간" }, { k: "we_sleep", label: "실제 잠드는 시간 (체감)" }, { k: "we_wake", label: "기상 시간" }] },
  { id: "nw", type: "pills", title: "밤에 보통 몇 번 깨시나요?", k: "night_wakings", opts: ["0회 (안 깸)", "1회", "2회", "3회", "4회 이상"] },
  { id: "bts", type: "pills", title: "깨면 다시 잠드는 데\n얼마나 걸리나요? (체감)", k: "back_to_sleep", opts: ["바로 잠듦", "5~10분", "10~20분", "20~30분", "30분~1시간", "1시간 이상", "다시 못 잠"] },
  { id: "ts", type: "pills", title: "하루 총 수면 시간은\n대략 얼마인가요? (체감)", k: "total_sleep", opts: ["4시간 미만", "4~5시간", "5~6시간", "6~7시간", "7~8시간", "8~9시간", "9시간 이상"] },
  { id: "alarm", type: "pills", title: "아침에 어떻게 일어나시나요?", sub: "주로 해당하는 방식을 선택해 주세요", k: "alarm", opts: ["알람으로 바로 일어남", "알람 듣고도 잘 못 일어남", "알람을 여러 번 미루고 일어남", "알람 없이 자연스럽게 깸", "알람 쓰지만 그 전에 깸"] },
  { id: "nap", type: "pillsub", title: "평소에 낮잠을 자시나요?", k: "nap", opts: ["안 잔다", "가끔", "주 1~2회", "거의 매일"], subOn: ["가끔", "주 1~2회", "거의 매일"], subL: "낮잠 시간대와 길이를 알려주세요", subPh: "예: 오후 1시, 20분" },
  { id: "chrono", type: "pills", title: "아침형인가요, 저녁형인가요?", k: "chronotype", opts: ["확실한 아침형", "약간 아침형", "중간", "약간 저녁형", "확실한 저녁형"] },
  { id: "ideal", type: "timegroup", title: "아무 제약이 없다면\n몇 시에 자고 일어나고 싶으세요?", sub: "실제 스케줄이 아닌, 몸이 원하는 자연스러운 수면 시간이에요.\n크로노타입(생체시계 성향) 파악에 참고됩니다.", fields: [{ k: "ideal_bed", label: "희망 취침 시간" }, { k: "ideal_wake", label: "희망 기상 시간" }] },
  // 6
  { id: "housing", type: "pills", sec: "수면 환경", sn: 6, title: "거주 형태는?", k: "housing", opts: ["아파트", "주택", "오피스텔/원룸", "기타"] },
  { id: "etemp", type: "pills", title: "침실 온도는 어떤 편인가요?", k: "env_temp", opts: ["서늘함 (18~20°C)", "적당함 (20~23°C)", "따뜻함 (23°C 이상)", "모르겠다"] },
  { id: "edark", type: "pills", title: "침실은 얼마나 어두운가요?", k: "env_dark", opts: ["매우 어두움", "보통", "밝은 편"] },
  { id: "enoise", type: "pills", title: "침실 소음 수준은?", k: "env_noise", opts: ["조용", "보통", "시끄러움"] },
  { id: "ematt", type: "pills", title: "매트리스 느낌은?", k: "env_mattress", opts: ["딱딱한 편", "보통", "부드러운 편"] },
  { id: "epart", type: "pills", title: "같은 방에서 함께 자는 사람이 있나요?", k: "bed_partner", opts: ["없음", "배우자/파트너", "자녀", "기타"] },
  { id: "etv", type: "pills", title: "침실에 TV가 있나요?", k: "tv_bedroom", opts: ["없음", "있고 보면서 잠듦", "있지만 안 봄"] },
  { id: "eaid", type: "text", title: "수면 보조 도구를 사용하시나요?", k: "sleep_aids", ph: "예: 귀마개, 안대, 백색소음 앱" },
  // 7
  { id: "ep", type: "epworth", sec: "주간 졸림 평가", sn: 7, title: "아래 상황에서 실제로 졸거나\n잠들 가능성이 얼마나 되나요?", sub: "단순한 피로감이 아니라, 진짜 졸음이 올 가능성을 떠올려 주세요.", sits: ["앉아서 책을 읽을 때", "TV를 볼 때", "공공장소에서 가만히 앉아 있을 때", "1시간 이상 차 탑승 시", "오후에 누워서 쉴 때", "대화 중 앉아 있을 때", "점심 후 조용히 앉아 있을 때", "운전 중 신호 대기 시"], sLbl: ["전혀 졸지\n않음", "약간 졸\n수 있음", "종종\n졸게 됨", "거의 확실히\n졸게 됨"] },
  // 8
  { id: "s1", type: "multi", sec: "수면 관련 증상", sn: 8, title: "잠들거나 수면을 유지할 때\n겪는 어려움이 있나요?", sub: "해당하는 항목을 모두 선택해 주세요", k: "symptoms_onset", opts: ["잠들려면 생각이 많아지거나 불안해진다", "통증/불편감 때문에 잠들기 어렵다", "다리가 불편하거나 저려서 잠들기 어렵다", "낯선 곳에서 오히려 더 잘 잔다"], hasOther: true },
  { id: "s2", type: "multi", title: "수면 중에 나타나는 증상이 있나요?", sub: "본인이 느끼거나, 주변에서 들은 것 모두 포함", k: "symptoms_sleep", opts: ["본인이 코를 심하게 곤다고 느낀다", "다른 사람이 코골이가 심하다고 말한다", "수면 중 호흡이 멈춘다고 들었다", "가위눌림 (수면마비)", "수면 중 특이 행동을 한다고 들었다"], hasOther: true, otherPh: "그 외 수면 중 증상" },
  { id: "s3", type: "multi", title: "낮 시간에 겪는 증상이 있나요?", k: "symptoms_day", opts: ["부적절한 상황에서 잠든 적 있음", "감정 격해질 때 힘이 빠지는 느낌", "아침 기상 시 두통"], hasOther: true, otherPh: "그 외 낮 시간 증상" },
  // 9
  { id: "bl", type: "beliefs", sec: "수면에 대한 생각", sn: 9, title: "아래 문장이 본인에게\n얼마나 해당되나요?", items: [{ k: "b1", t: "잠을 못 자면 다음 날 완전히 망한다고 느낀다" }, { k: "b2", t: "침대에 누우면 '오늘 잘 수 있을까' 걱정부터 된다" }, { k: "b3", t: "수면 시간이나 수면 분석앱 데이터를 자주 확인한다" }], scale: ["전혀\n아니다", "별로\n아니다", "보통", "그렇다", "매우\n그렇다"] },
  // 10
  { id: "caf", type: "text", sec: "생활 습관", sn: 10, title: "카페인 섭취량과 마지막 섭취 시간은?", sub: "커피, 차, 에너지 음료 등 모두 포함", k: "caffeine", ph: "예: 하루 커피 2잔, 마지막 오후 3시" },
  { id: "alc", type: "text", title: "음주 빈도와 양은?", k: "alcohol", ph: "예: 주 2회, 맥주 1~2캔 / 안 마심" },
  { id: "ex", type: "text", title: "운동을 하시나요?", sub: "주 횟수, 종류, 시간대를 알려주세요", k: "exercise", ph: "예: 주 3회, 러닝, 저녁 7시" },
  { id: "sun", type: "pills", title: "아침 기상 후 30분 이내에\n햇빛을 보시나요?", k: "sunlight", opts: ["거의 매일", "가끔", "거의 안 함"] },
  { id: "pb", type: "text", title: "취침 전이나 침대에서\n주로 하는 활동은?", k: "pre_bed", ph: "예: 스마트폰 40분 → 독서 20분" },
  { id: "ml", type: "text", title: "식사 패턴을 알려주세요", sub: "대략적인 시간과 야식 여부", k: "meals", ph: "예: 아침 7시 / 점심 12시 / 저녁 7시" },
  // 11
  { id: "slv", type: "pills", sec: "스트레스 및 감정", sn: 11, title: "요즘 전반적인 스트레스 수준은?", sub: "업무 외 생활 스트레스도 포함", k: "stress_level", opts: ["매우 낮음", "낮음", "보통", "높음", "매우 높음"] },
  { id: "mood", type: "pillsub", title: "최근 우울하거나 불안한 상태가\n지속되고 있나요?", k: "mood", opts: ["아니오", "예"], subOn: ["예"], subL: "간단히 알려주세요", subPh: "예: 한 달째 무기력 상태", subRows: 2 },
  // 12
  { id: "morn", type: "pills", sec: "기상 후 상태 & 꿈", sn: 12, title: "아침에 눈 뜨고 30분 이내\n컨디션은 어떤가요?", k: "morning_state", opts: ["매우 멍함", "약간 졸림", "비교적 개운", "바로 활력"], desc: ["기상이 너무 힘들다", "움직일 수는 있다", "나쁘지 않다", "바로 시작 가능"] },
  { id: "drf", type: "pills", title: "꿈을 얼마나 자주 기억하나요?", k: "dream_freq", opts: ["거의 매일", "주 2~3회", "가끔", "거의 기억 안 남"] },
  { id: "drc", type: "text", title: "꿈의 특징이 있다면 알려주세요", k: "dream_char", ph: "예: 매우 생생함, 악몽이 잦음" },
  // 13
  { id: "ref", type: "pills", sec: "코칭 동기 및 기대", sn: 13, title: "수면 코칭을 알게 된 경로는?", k: "referral", opts: ["직접 검색", "지인 추천", "병원/전문가 연계", "SNS/콘텐츠", "기타"] },
  { id: "cr", type: "ta", title: "코칭을 받으려는 가장 큰 이유와\n기대하는 변화는 무엇인가요?", k: "coaching_reason", ph: "예: 낮에 졸리지 않고 집중하고 싶어요" },
  { id: "pa", type: "ta", title: "수면 개선을 위해 시도해본 것과\n효과는 어떠했나요?", k: "prev_attempts", ph: "예: 수면제(의존 걱정) / 명상 앱(안 맞음)" },
  // 14 — 5 items
  { id: "rd", type: "readiness", sec: "변화 준비도", sn: 14, title: "아래 문장이 본인에게\n얼마나 해당되나요?", sub: "1: 전혀 아니다 ~ 5: 매우 그렇다", items: ["수면 문제를 해결하기 위해 생활 습관을 바꿀 준비가 되어 있다", "전문가의 도움이 있다면 그 지침을 따를 수 있다고 생각한다", "새로운 습관을 시도할 때 어려움이 있을 수 있음을 받아들인다", "수면이 개선되면 삶의 질이 나아질 거라 기대한다", "장기적으로 꾸준히 노력할 의지가 있다"] },
  { id: "done", type: "complete" },
];
