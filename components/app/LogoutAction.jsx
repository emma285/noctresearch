"use client";
// 내정보 탭의 로그아웃 액션 (ActionRow 형태). 클릭 → /sign-in
import { LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { Row } from "./primitives";

export default function LogoutAction() {
  const { signOut } = useClerk();
  return (
    <Row
      icon={LogOut}
      title="로그아웃"
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
    />
  );
}
