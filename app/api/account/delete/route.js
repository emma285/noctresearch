// app/api/account/delete/route.js
// 선수 본인 회원 탈퇴. 로그인 본인만, 코치 계정은 불가. 데이터 전부 삭제 후 Clerk 계정 삭제(마지막).
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentUser } from "../../../../lib/whoop/session";
import { isCoachEmail } from "../../../../lib/coach";
import { deleteAccountData } from "../../../../lib/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "로그인이 필요해요." }, { status: 401 });
  if (isCoachEmail(user.email)) {
    return NextResponse.json({ ok: false, message: "코치 계정은 탈퇴할 수 없어요." }, { status: 403 });
  }
  const { confirm } = await request.json().catch(() => ({}));
  if (confirm !== "탈퇴") {
    return NextResponse.json({ ok: false, message: "확인 문구가 맞지 않아요." }, { status: 400 });
  }

  try {
    await deleteAccountData(user.email);
    revalidateTag("athlete-data");
    await (await getClerk()).users.deleteUser(user.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("account delete failed:", e?.message);
    return NextResponse.json({ ok: false, message: "탈퇴 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
