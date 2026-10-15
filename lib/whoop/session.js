// lib/whoop/session.js — 현재 로그인 선수(Clerk userId + 이메일). WHOOP 연결의 사람 매핑 키는 userEmail.
import { auth, clerkClient } from "@clerk/nextjs/server";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

export async function getCurrentUser() {
  const { userId } = auth();
  if (!userId) return null;
  const cc = await getClerk();
  const u = await cc.users.getUser(userId);
  const email = u?.emailAddresses?.[0]?.emailAddress || "";
  return email ? { userId, email } : null;
}
