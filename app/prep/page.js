// app/prep/page.js — 코칭 준비 자료 (선수 로그인 필요, middleware 보호)
import { currentUser } from "@clerk/nextjs/server";
import PrepForm from "../../components/prep/PrepForm";

export const metadata = { title: "코칭 준비 자료 | 녹트리서치" };

export default async function PrepPage() {
  const user = await currentUser();
  const name = user?.unsafeMetadata?.name || user?.firstName || "";
  return <PrepForm name={name} />;
}
