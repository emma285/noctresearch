// app/api/coach/whoop-delete/route.js
// 코치 전용. 코칭 상태 "종료"인 선수의 WHOOP 데이터(연결·수면·회복) 삭제. 코칭 자료는 유지.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { getAthleteByRef } from "../../../../lib/master";
import { deleteWhoopData } from "../../../../lib/whoop/store";
import { logAccess } from "../../../../lib/accessLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await currentUser();
  if (!isCoachEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return NextResponse.json({ ok: false, message: "코치 권한이 없어요." }, { status: 403 });
  }
  const { ref } = await request.json().catch(() => ({}));
  const athlete = ref ? await getAthleteByRef(ref) : null;
  if (!athlete?.email) return NextResponse.json({ ok: false, message: "선수를 찾을 수 없어요." }, { status: 404 });
  if (athlete.status !== "종료") {
    return NextResponse.json({ ok: false, message: "코칭 상태가 '종료'인 선수만 삭제할 수 있어요." }, { status: 400 });
  }

  try {
    await deleteWhoopData(athlete.email);
    await logAccess({ actor: user.emailAddresses[0].emailAddress, action: "delete", resource: "WHOOP 데이터", target: { email: athlete.email, clientId: athlete.pageId }, path: "/api/coach/whoop-delete" });
    revalidateTag("athlete-data");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("whoop delete failed:", e?.message);
    return NextResponse.json({ ok: false, message: "삭제 중 문제가 생겼어요." }, { status: 500 });
  }
}
