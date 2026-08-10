// 루틴 타입 정의 (RoutineLog 입력 + 그날 상세 표시 공용). 라벨·색·아이콘·옵션 단일 소스.
import { Dumbbell, Coffee, Bed, Utensils, Wine, Pencil } from "lucide-react";

export const TYPES = {
  training: { label: "훈련", icon: Dumbbell, color: "#4355B0", bg: "#eef0fb", detailLb: "강도는?", opts: ["가벼움", "중간", "고강도", "경기"], durLb: "몇 시간 했어요?", durOpts: ["30분", "1시간", "1시간 30분", "2시간", "2시간 이상"] },
  caffeine: { label: "카페인", icon: Coffee, color: "#B9770E", bg: "#fbf3e6", detailLb: "몇 잔?", opts: ["½잔", "1잔", "2잔", "3잔+"] },
  nap: { label: "낮잠", icon: Bed, color: "#3aa7cf", bg: "#e8f5fb", detailLb: "얼마나?", opts: ["~20분", "30분", "1시간", "1시간+"] },
  meal: { label: "식사", icon: Utensils, color: "#1F8A4C", bg: "#e7f4ec", detailLb: "무엇을?", opts: ["아침", "점심", "저녁", "간식"] },
  alcohol: { label: "술", icon: Wine, color: "#F4978E", bg: "#fdeeeb", detailLb: "얼마나?", opts: ["1잔", "2~3잔", "많이"] },
  etc: { label: "기타", icon: Pencil, color: "#6b7280", bg: "#f1f2f4", textLb: "무슨 일이 있었나요?", textPh: "예: 원정 이동, 물리치료, 사우나…", durLb: "소요시간 (선택)", durOpts: ["30분", "1시간", "2시간", "반나절", "하루종일"] },
};
export const ORDER = ["training", "caffeine", "nap", "meal", "alcohol", "etc"];
