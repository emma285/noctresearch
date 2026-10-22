"use client";
// components/whoop/ClearWhoopNotice.jsx — WHOOP 연결 결과 쿠키(whoop_notice)를 한 번 보여준 뒤 삭제.
// 다음에 내정보 > WHOOP 으로 들어올 때 같은 문구가 다시 뜨지 않게.
import { useEffect } from "react";

export default function ClearWhoopNotice() {
  useEffect(() => {
    document.cookie = "whoop_notice=; path=/whoop; max-age=0";
  }, []);
  return null;
}
