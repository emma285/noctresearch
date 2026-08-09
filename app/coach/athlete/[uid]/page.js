// 코치 · 선수 상세 허브 — 선수별 자료 확인 + 세션별 준비.
// 코치 이메일만 접근. 자료는 lib/athleteAssets 로 자동 연결(수동 URL 입력 불필요).
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { isCoachEmail } from "../../../../lib/coach";
import { resolveAssets } from "../../../../lib/athleteAssets";

async function getClerk() {
  return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

function Notice({ children }) {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Pretendard',sans-serif", color: "#111", background: "#F2F3F6", padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>{children}</div>
    </main>
  );
}

const CSS = `
.noct-ad{--navy:#0D1B2A;--ink:#111;--gray:#6b7280;--gray2:#9aa3ad;--line:#e6e7eb;--primary:#4355B0;--sky:#7EC8E3;--grad:linear-gradient(90deg,#4355B0,#7EC8E3);
  font-family:'Pretendard Variable','Pretendard',-apple-system,sans-serif;background:#F2F3F6;color:var(--ink);min-height:100vh;letter-spacing:-.02em;-webkit-font-smoothing:antialiased;line-height:1.5;overflow-x:hidden;max-width:100vw;}
.noct-ad .wrap{max-width:900px;margin:0 auto;padding:32px 24px 72px;width:100%;}
.noct-ad .tile > div{min-width:0;}
.noct-ad .tile .tt,.noct-ad .tile .td,.noct-ad .hemail{overflow-wrap:anywhere;}
.noct-ad .back{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:var(--primary);text-decoration:none;margin-bottom:16px;}
.noct-ad .back:hover{text-decoration:underline;}
.noct-ad .hero{border-radius:16px;overflow:hidden;color:#fff;background:linear-gradient(135deg,#0D1B2A 0%,#22356d 100%);padding:26px 28px;box-shadow:0 14px 40px rgba(13,27,42,.2);}
.noct-ad .hname{font-size:26px;font-weight:800;letter-spacing:-.7px;}
.noct-ad .hname span{font-size:15px;font-weight:600;color:rgba(255,255,255,.6);margin-left:6px;}
.noct-ad .hemail{font-size:12.5px;color:rgba(255,255,255,.6);margin-top:5px;}
.noct-ad .hchips{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px;}
.noct-ad .hchip{font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.9);}
.noct-ad .hchip b{color:#fff;}
.noct-ad .sec{margin-top:30px;}
.noct-ad .sec-label{font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--primary);}
.noct-ad .sec-title{font-size:20px;font-weight:800;letter-spacing:-.4px;color:var(--navy);margin-top:3px;margin-bottom:14px;}
.noct-ad .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.noct-ad .tile{display:flex;align-items:center;justify-content:space-between;gap:14px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 1px 2px rgba(13,27,42,.05);text-decoration:none;color:inherit;transition:transform .14s,box-shadow .14s,border-color .14s;}
.noct-ad a.tile:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(13,27,42,.1);border-color:#c7cef0;}
.noct-ad .tile .tt{font-size:15.5px;font-weight:800;color:var(--navy);}
.noct-ad .tile .td{font-size:12.5px;color:var(--gray);margin-top:3px;}
.noct-ad .tile.off{opacity:.55;}
.noct-ad .go{width:32px;height:32px;border-radius:50%;flex-shrink:0;background:#eef0fb;color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800;}
.noct-ad a.tile:hover .go{background:var(--primary);color:#fff;}
.noct-ad .scard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 1px 2px rgba(13,27,42,.05);margin-bottom:12px;}
.noct-ad .scard.off{border-style:dashed;background:transparent;box-shadow:none;}
.noct-ad .stop{display:flex;align-items:center;gap:10px;}
.noct-ad .sn{width:30px;height:30px;border-radius:9px;background:var(--primary);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;}
.noct-ad .scard.off .sn{background:#e5e7ee;color:var(--gray2);}
.noct-ad .stt{font-size:16px;font-weight:800;color:var(--navy);}
.noct-ad .scard.off .stt{color:var(--gray2);}
.noct-ad .sday{font-size:12px;color:var(--gray);margin-left:auto;}
.noct-ad .sbtns{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
.noct-ad .btn{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:800;text-decoration:none;padding:9px 15px;border-radius:10px;white-space:nowrap;cursor:pointer;}
.noct-ad .btn.primary{background:var(--primary);color:#fff;}
.noct-ad .btn.primary:hover{box-shadow:0 8px 20px rgba(67,85,176,.28);}
.noct-ad .btn.ghost{background:#fff;color:var(--primary);border:1px solid #dbe0f4;}
.noct-ad .btn.ghost:hover{background:#eef0fb;}
.noct-ad .empty{background:#fff;border:1.5px dashed #d3d6de;border-radius:14px;padding:28px 22px;text-align:center;color:var(--gray2);font-size:13.5px;line-height:1.6;}
.noct-ad .manage{margin-top:22px;font-size:13px;}
.noct-ad .manage a{color:var(--primary);font-weight:800;text-decoration:none;}
.noct-ad .manage a:hover{text-decoration:underline;}
@media(max-width:640px){.noct-ad .wrap{padding:22px 16px 56px;}.noct-ad .grid{grid-template-columns:1fr;}}
`;

export default async function AthleteDetailPage({ params }) {
  const me = await currentUser();
  const myEmail = me?.emailAddresses?.[0]?.emailAddress;
  if (!isCoachEmail(myEmail)) return <Notice>이 페이지는 코치만 볼 수 있어요.</Notice>;

  const uid = params?.uid;
  if (!uid) return <Notice>선수가 지정되지 않았어요.</Notice>;

  let a;
  try {
    const cc = await getClerk();
    const u = await cc.users.getUser(uid);
    a = {
      uid,
      name: u?.unsafeMetadata?.name || u?.firstName || u?.username || u?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "이름 미상",
      email: u?.emailAddresses?.[0]?.emailAddress || "",
      intakeDone: u?.publicMetadata?.intakeDone === true,
      programWeeks: u?.publicMetadata?.programWeeks || "",
      sessionLabel: u?.publicMetadata?.sessionLabel || "",
      firstSessionAt: u?.publicMetadata?.firstSessionAt || "",
      reportUrl: u?.publicMetadata?.reportUrl || "",
      guideUrl: u?.publicMetadata?.guideUrl || "",
      dataUrl: u?.publicMetadata?.dataUrl || "",
    };
  } catch {
    return <Notice>선수를 찾을 수 없어요. (uid: {uid})</Notice>;
  }

  const assets = resolveAssets(a);
  const sessionLabel = a.sessionLabel || (a.firstSessionAt ? a.firstSessionAt.slice(0, 10) : "미배정");

  return (
    <div className="noct-ad">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <a className="back" href="/portal">← 코치 대시보드</a>

        <div className="hero">
          <div className="hname">{a.name} <span>선수</span></div>
          {a.email && <div className="hemail">{a.email}</div>}
          <div className="hchips">
            <span className="hchip">{a.intakeDone ? "설문 완료" : "설문 대기"}</span>
            <span className="hchip">첫 세션 <b>{sessionLabel}</b></span>
            <span className="hchip">프로그램 <b>{a.programWeeks ? `${a.programWeeks}주` : "미정"}</b></span>
          </div>
        </div>

        {/* 선수 자료 */}
        <div className="sec">
          <div className="sec-label">Materials</div>
          <div className="sec-title">선수 자료</div>
          <div className="grid">
            {assets.data
              ? <a className="tile" href={assets.data}><div><div className="tt">선수 데이터</div><div className="td">사전 질문지 응답 전체</div></div><div className="go">→</div></a>
              : <div className="tile off"><div><div className="tt">선수 데이터</div><div className="td">아직 연결된 데이터가 없어요</div></div></div>}
            {assets.report
              ? <a className="tile" href={assets.report}><div><div className="tt">수면 리포트 확인</div><div className="td">1차 수면 평가 리포트</div></div><div className="go">→</div></a>
              : <div className="tile off"><div><div className="tt">수면 리포트</div><div className="td">아직 만든 리포트가 없어요</div></div></div>}
          </div>
        </div>

        {/* 코칭 세션 */}
        <div className="sec">
          <div className="sec-label">Sessions</div>
          <div className="sec-title">코칭 세션 준비</div>

          {assets.sessions.length === 0 && (
            <div className="empty">아직 준비된 세션 자료가 없어요.<br />세션 진행에 맞춰 리포트·가이드가 추가됩니다.</div>
          )}

          {assets.sessions.map((s) => (
            <div className="scard" key={s.n}>
              <div className="stop">
                <span className="sn">{s.n}</span>
                <span className="stt">{s.label}</span>
                {s.n === 1 && sessionLabel !== "미배정" && <span className="sday">{sessionLabel}</span>}
              </div>
              <div className="sbtns">
                {s.guide && <a className="btn primary" href={s.guide}>세션 가이드 열기</a>}
                {s.report && <a className="btn ghost" href={s.report}>리포트 확인</a>}
              </div>
            </div>
          ))}

          {/* 다음 세션 (아직 준비 전) */}
          <div className="scard off">
            <div className="stop">
              <span className="sn">{(assets.sessions[assets.sessions.length - 1]?.n || 0) + 1}</span>
              <span className="stt">다음 세션</span>
            </div>
            <div className="sbtns"><span className="btn ghost" style={{ opacity: 0.6, cursor: "default" }}>세션 진행에 맞춰 준비</span></div>
          </div>
        </div>

        <div className="manage">
          <a href={`/coach/assign?uid=${a.uid}`}>선수 정보 관리(세션 날짜·프로그램·자료 링크) →</a>
        </div>
      </div>
    </div>
  );
}
