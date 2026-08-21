// lib/attachments.js — 선수가 올린 첨부 자료(코칭 준비자료 등) 저장·조회.
// userEmail으로 선수 식별(로그와 동일). 코치 앱 선수 상세에서 렌더.
import { desc, eq } from "drizzle-orm";
import { db, schema } from "./db/index.js";

const { attachments } = schema;

// 선수 첨부 저장. { email, clientId?, kind, note, items, files } → row.
export async function saveAttachment({ email, clientId = null, kind, note = "", items = [], files = [] }) {
  try {
    const [row] = await db.insert(attachments)
      .values({ userEmail: email || null, clientId, kind, note, data: { items, files } })
      .returning({ id: attachments.id });
    return row?.id || null;
  } catch (e) {
    console.error("saveAttachment failed:", e?.message);
    return null;
  }
}

// 선수의 첨부 목록(최신순). files/items 포함.
export async function getAttachments(email, limit = 50) {
  if (!email) return [];
  try {
    const rows = await db.select().from(attachments)
      .where(eq(attachments.userEmail, email))
      .orderBy(desc(attachments.createdAt)).limit(limit);
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      note: r.note || "",
      items: r.data?.items || [],
      files: r.data?.files || [],
      createdAt: r.createdAt,
    }));
  } catch (e) {
    console.error("getAttachments failed:", e?.message);
    return [];
  }
}
