// app/api/consent/route.js
// 동의 기록 — GET: 건강 정보 동의 팝업이 필요한지(동의 기록 없는 선수만) / POST: 동의 시각 기록.
// POST body { type: "whoop" } → WHOOP 기록 저장 동의, 그 외 → 건강 정보 동의.
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../lib/coach";
import { hasHealthConsent } from "../../../lib/consent";

export const dynamic = "force-dynamic";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ required: false });
  const u = await (await getClerk()).users.getUser(userId);
  const email = u?.emailAddresses?.[0]?.emailAddress || "";
  return NextResponse.json({ required: !isCoachEmail(email) && !hasHealthConsent(u) });
}

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const key = body.type === "whoop" ? "whoopConsentAt" : "healthConsentAt";
  await (await getClerk()).users.updateUserMetadata(userId, {
    publicMetadata: { [key]: new Date().toISOString() },
  });
  return NextResponse.json({ success: true });
}
