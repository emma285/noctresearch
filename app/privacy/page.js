// app/privacy/page.js — 개인정보처리방침 (공개 페이지, 로그인 불필요).
// 본문은 content/privacy-policy.md 하나만 고치면 됨 — 빌드 때 읽어 정적 페이지로 만듦.
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

export const metadata = { title: "개인정보처리방침 | NOCT" };
export const dynamic = "force-static";

// **굵게** 만 처리하는 인라인 렌더
function inline(text, key) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={`${key}-${i}`} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      : part
  );
}

// 방침 md에 쓰는 문법만 지원: # / ## 제목, 문단, - 목록, | 표, ---
function renderMarkdown(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const k = `b${i}`;
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("# ")) {
      out.push(<h1 key={k} className="text-[24px] font-bold tracking-[-0.4px] text-foreground">{line.slice(2)}</h1>);
      i++;
    } else if (line.startsWith("## ")) {
      out.push(<h2 key={k} className="text-[17px] font-bold text-foreground mt-8 mb-3">{line.slice(3)}</h2>);
      i++;
    } else if (line.trim() === "---") {
      i++;
    } else if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={k} className="overflow-x-auto my-3 rounded-xl border border-border">
          <table className="w-full text-[13px] leading-relaxed">
            <thead className="bg-muted/50">
              <tr>{head.map((c, j) => <th key={j} className="text-left font-semibold text-foreground px-3 py-2 whitespace-nowrap">{inline(c, `${k}h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} className="border-t border-border align-top">
                  {r.map((c, j) => <td key={j} className="px-3 py-2 text-muted-foreground">{inline(c, `${k}r${ri}c${j}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) { items.push(lines[i].slice(2)); i++; }
      out.push(
        <ul key={k} className="list-disc pl-5 my-2 space-y-1 text-[14px] text-muted-foreground leading-relaxed">
          {items.map((t, j) => <li key={j}>{inline(t, `${k}l${j}`)}</li>)}
        </ul>
      );
    } else {
      out.push(<p key={k} className="text-[14px] text-muted-foreground leading-relaxed my-2">{inline(line, k)}</p>);
      i++;
    }
  }
  return out;
}

export default async function PrivacyPage() {
  const md = await readFile(path.join(process.cwd(), "content", "privacy-policy.md"), "utf8");
  return (
    <main className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-[720px] px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-16">
        <Link href="/" className="inline-block text-[13px] font-semibold text-muted-foreground mb-5">NOCT 수면코칭</Link>
        {renderMarkdown(md)}
      </div>
    </main>
  );
}
