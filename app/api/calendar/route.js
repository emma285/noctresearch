// app/api/calendar/route.js — 캘린더 이벤트 CRUD. 선수는 본인 일정(경기·이동·훈련·기타)만, 코치는 전부.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../lib/coach";
import { getAthleteByEmail } from "../../../lib/master";
import { createEvent, updateEvent, deleteEvent, getEventOwner, ATHLETE_TYPES } from "../../../lib/calendar";

export const runtime = "nodejs";

async function getClerk() { return typeof clerkClient === "function" ? await clerkClient() : clerkClient; }

// 현재 유저의 코치여부 + 본인 마스터 pageId
async function whoami() {
  const { userId } = auth();
  if (!userId) return { authed: false };
  const cc = await getClerk();
  const u = await cc.users.getUser(userId);
  const email = u?.emailAddresses?.[0]?.emailAddress || "";
  const coach = isCoachEmail(email);
  const athlete = email ? await getAthleteByEmail(email) : null;
  return { authed: true, email, coach, myPageId: athlete?.pageId || null };
}

export async function POST(request) {
  try {
    const me = await whoami();
    if (!me.authed) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });
    const { masterPageId, type, title, start, end, memo, isPublic } = await request.json();
    // 선수: 본인 것만, 허용 종류만, 출처=선수
    if (!me.coach) {
      if (!me.myPageId || masterPageId !== me.myPageId) return NextResponse.json({ success: false, message: "본인 일정만 추가할 수 있어요." }, { status: 403 });
      if (!ATHLETE_TYPES.includes(type)) return NextResponse.json({ success: false, message: "선택할 수 없는 종류예요." }, { status: 400 });
    }
    const target = me.coach ? masterPageId : me.myPageId;
    const r = await createEvent(target, { type, title, start, end, memo, isPublic: me.coach ? isPublic : true, source: me.coach ? "코치" : "선수" });
    if (!r.ok) return NextResponse.json({ success: false, message: r.reason || "생성 실패" }, { status: 400 });
    revalidateTag("athlete-data");
    return NextResponse.json({ success: true, id: r.id });
  } catch (e) {
    return NextResponse.json({ success: false, message: e?.message || "실패" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const me = await whoami();
    if (!me.authed) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });
    const { id, type, title, start, end, memo, isPublic } = await request.json();
    if (!id) return NextResponse.json({ success: false, message: "id 필요" }, { status: 400 });
    if (!me.coach) {
      const owner = await getEventOwner(id);
      if (!me.myPageId || owner !== me.myPageId) return NextResponse.json({ success: false, message: "본인 일정만 수정할 수 있어요." }, { status: 403 });
      if (type !== undefined && !ATHLETE_TYPES.includes(type)) return NextResponse.json({ success: false, message: "선택할 수 없는 종류예요." }, { status: 400 });
    }
    const ok = await updateEvent(id, { type, title, start, end, memo, isPublic: me.coach ? isPublic : undefined });
    revalidateTag("athlete-data");
    return NextResponse.json({ success: ok });
  } catch (e) {
    return NextResponse.json({ success: false, message: e?.message || "실패" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const me = await whoami();
    if (!me.authed) return NextResponse.json({ success: false, message: "로그인이 필요해요." }, { status: 401 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ success: false, message: "id 필요" }, { status: 400 });
    if (!me.coach) {
      const owner = await getEventOwner(id);
      if (!me.myPageId || owner !== me.myPageId) return NextResponse.json({ success: false, message: "본인 일정만 삭제할 수 있어요." }, { status: 403 });
    }
    const ok = await deleteEvent(id);
    revalidateTag("athlete-data");
    return NextResponse.json({ success: ok });
  } catch (e) {
    return NextResponse.json({ success: false, message: e?.message || "실패" }, { status: 500 });
  }
}
