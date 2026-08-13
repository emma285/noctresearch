/*
  코치 대시보드 — emma@ 등 코치 이메일로 로그인하면 /portal 에서 이 화면이 뜬다.
  선수 허브(.noct-hub) 대신 코치용. 담당 선수 목록 + 배정 링크.
  디자인은 포털 팔레트와 동기화(다크 히어로 + 카드), .noct-coach 스코프.
*/

import Link from "next/link";
import LogoutButton from "../portal/LogoutButton";

const CSS = `
.noct-coach{
  --navy:#0D1B2A;--ink:#111;--gray:#6b7280;--gray2:#9aa3ad;--line:#e6e7eb;
  --indigo:#4355B0;--sky:#7EC8E3;--grad:linear-gradient(90deg,#4355B0,#7EC8E3);
  font-family:'Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,sans-serif;
  background:#F2F3F6;color:var(--ink);line-height:1.5;min-height:100vh;overflow-x:hidden;max-width:100vw;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;letter-spacing:-.02em;
}
.noct-coach .wrap{max-width:960px;margin:0 auto;padding:36px 24px 72px;width:100%;}
.noct-coach .acard > div{min-width:0;}
.noct-coach .aemail{overflow-wrap:anywhere;}
.noct-coach .hero{position:relative;overflow:hidden;border-radius:20px;padding:30px 32px 28px;
  background:linear-gradient(135deg,#0D1B2A 0%,#22356d 100%);color:#fff;box-shadow:0 18px 50px rgba(13,27,42,.22);}
.noct-coach .hero::after{content:"";position:absolute;right:-90px;top:-130px;width:340px;height:340px;
  border-radius:50%;background:radial-gradient(circle,rgba(126,200,227,.28),transparent 70%);pointer-events:none;}
.noct-coach .htop{display:flex;justify-content:space-between;align-items:center;gap:12px;position:relative;z-index:1;}
.noct-coach .logo{height:16px;filter:brightness(0) invert(1);opacity:.94;}
.noct-coach .eyebrow{font-size:11px;font-weight:800;letter-spacing:.18em;color:var(--sky);margin-top:20px;position:relative;z-index:1;}
.noct-coach h1{font-size:28px;font-weight:800;letter-spacing:-.9px;margin-top:8px;position:relative;z-index:1;}
.noct-coach h1 span{font-size:16px;font-weight:600;color:rgba(255,255,255,.6);margin-left:4px;}
.noct-coach .kpis{display:flex;margin-top:24px;border-top:1px solid rgba(255,255,255,.12);padding-top:20px;position:relative;z-index:1;flex-wrap:wrap;}
.noct-coach .kpi{flex:1;min-width:100px;padding:0 22px;border-left:1px solid rgba(255,255,255,.12);}
.noct-coach .kpi:first-child{padding-left:0;border-left:none;}
.noct-coach .kv{display:block;font-size:26px;font-weight:800;letter-spacing:-1px;color:#fff;line-height:1;font-variant-numeric:tabular-nums;}
.noct-coach .kv i{font-style:normal;font-size:13px;font-weight:600;color:rgba(255,255,255,.66);margin-left:3px;}
.noct-coach .kk{display:block;font-size:12px;color:rgba(255,255,255,.62);margin-top:8px;font-weight:500;}

.noct-coach .sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:38px 0 16px;}
.noct-coach .sec-label{font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--indigo);}
.noct-coach .sec-title{font-size:21px;font-weight:800;letter-spacing:-.4px;color:var(--navy);margin-top:3px;}
.noct-coach .count{font-size:12.5px;font-weight:700;color:var(--gray);background:#fff;border:1px solid var(--line);padding:6px 13px;border-radius:999px;white-space:nowrap;}

.noct-coach .alist{display:flex;flex-direction:column;gap:12px;}
.noct-coach .acard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 1px 2px rgba(13,27,42,.05);
  display:grid;grid-template-columns:1fr auto;gap:14px 18px;align-items:center;text-decoration:none;color:inherit;
  transition:transform .14s,box-shadow .14s,border-color .14s;}
.noct-coach a.acard:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(13,27,42,.1);border-color:#c7cef0;}
.noct-coach .ago{width:34px;height:34px;border-radius:50%;background:#eef0fb;color:var(--indigo);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;justify-self:end;}
.noct-coach a.acard:hover .ago{background:var(--indigo);color:#fff;}
.noct-coach .aname{font-size:17px;font-weight:800;color:var(--navy);letter-spacing:-.4px;}
.noct-coach .aname span{font-size:12.5px;font-weight:600;color:var(--gray2);margin-left:6px;}
.noct-coach .aemail{font-size:12.5px;color:var(--gray);margin-top:3px;}
.noct-coach .ameta{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px;}
.noct-coach .chip{font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:999px;background:#f2f3f6;color:var(--gray);border:1px solid var(--line);}
.noct-coach .chip.g{background:rgba(31,138,76,.1);color:#1f8a4c;border-color:rgba(31,138,76,.2);}
.noct-coach .chip.w{background:rgba(185,119,14,.1);color:#9c6c16;border-color:rgba(185,119,14,.2);}
.noct-coach .chip b{font-weight:800;}
.noct-coach .aact{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-self:end;justify-content:flex-end;max-width:320px;}
.noct-coach .btn{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;text-decoration:none;
  padding:8px 13px;border-radius:9px;white-space:nowrap;transition:transform .14s,box-shadow .14s,background .14s;cursor:pointer;}
.noct-coach .btn.primary{background:var(--indigo);color:#fff;}
.noct-coach .btn.primary:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(67,85,176,.28);}
.noct-coach .btn.ghost{background:#fff;color:var(--indigo);border:1px solid #dbe0f4;}
.noct-coach .btn.ghost:hover{background:#eef0fb;}
.noct-coach .btn.off{background:#f2f3f6;color:var(--gray2);border:1px solid var(--line);cursor:not-allowed;}

.noct-coach .empty{background:#fff;border:1.5px dashed #d3d6de;border-radius:14px;padding:40px 24px;text-align:center;color:var(--gray2);font-size:14px;line-height:1.6;}
.noct-coach .foot{margin-top:44px;padding-top:20px;border-top:1px solid var(--line);font-size:12.5px;color:var(--gray2);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;}

@media (max-width:720px){
  .noct-coach .wrap{padding:24px 18px 56px;}
  .noct-coach .hero{padding:24px 20px;}
  .noct-coach h1{font-size:24px;}
  .noct-coach .kpi{flex:0 0 50%;min-width:0;padding:12px 16px;border-left:none;}
  .noct-coach .kpi:nth-child(odd){padding-left:0;}
  .noct-coach .kpis{padding-top:8px;}
  .noct-coach .acard{grid-template-columns:1fr;}
  .noct-coach .aact{flex-direction:row;justify-self:start;align-items:center;}
}
`;

export default function CoachDashboard({ coachName = "코치", athletes = [] }) {
  const total = athletes.length;
  const intakeDoneCount = athletes.filter((a) => a.intakeDone).length;
  const assignedCount = athletes.filter((a) => a.firstSessionAt || a.sessionLabel).length;

  return (
    <div className="noct-coach">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">

        <div className="hero">
          <div className="htop">
            <img src="/noct-logo.png" className="logo" alt="NOCT RESEARCH" />
            <LogoutButton />
          </div>
          <div className="eyebrow">COACH DASHBOARD</div>
          <h1>{coachName} <span>코치</span></h1>
          <div className="kpis">
            <div className="kpi"><span className="kv">{total}</span><span className="kk">담당 선수</span></div>
            <div className="kpi"><span className="kv">{intakeDoneCount}</span><span className="kk">설문 완료</span></div>
            <div className="kpi"><span className="kv">{assignedCount}</span><span className="kk">세션 배정</span></div>
          </div>
        </div>

        <div className="sec-head">
          <div>
            <div className="sec-label">Athletes</div>
            <div className="sec-title">담당 선수</div>
          </div>
          <span className="count">가입 순</span>
        </div>

        {total === 0 ? (
          <div className="empty">아직 가입한 선수가 없어요.<br />선수가 가입·설문을 완료하면 이 목록에 나타납니다.</div>
        ) : (
          <div className="alist">
            {athletes.map((a) => (
              <Link className="acard" key={a.uid} href={a.email ? `/coach/clients/${encodeURIComponent(a.email)}` : `/coach/athlete/${a.uid}`}>
                <div>
                  <div className="aname">{a.name}<span>선수</span></div>
                  {a.email && <div className="aemail">{a.email}</div>}
                  <div className="ameta">
                    <span className={`chip ${a.intakeDone ? "g" : "w"}`}>{a.intakeDone ? "설문 완료" : "설문 대기"}</span>
                    <span className="chip">세션 <b>{a.sessionLabel || (a.firstSessionAt ? a.firstSessionAt.slice(0, 10) : "미배정")}</b></span>
                    <span className="chip">프로그램 <b>{a.programWeeks ? `${a.programWeeks}주` : "미정"}</b></span>
                  </div>
                </div>
                <div className="ago">→</div>
              </Link>
            ))}
          </div>
        )}

        <div className="foot">
          <span>NOCT RESEARCH · 코치 전용</span>
          <span>선수 {total}명</span>
        </div>

      </div>
    </div>
  );
}
