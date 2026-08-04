"use client";
import IntakeForm from "../../components/IntakeForm";
import { QUESTIONS } from "../../data/questions_athlete";

// 운동선수 전용 사전 질문지 (/athlete)
// - questions_athlete.js 사용 (골프·합숙 showIf 분기 포함)
// - storageKey로 임시저장(자동 저장/복원) 활성화
export default function AthletePage() {
  return <IntakeForm questions={QUESTIONS} storageKey="noct_athlete_intake" formType="athlete" />;
}
