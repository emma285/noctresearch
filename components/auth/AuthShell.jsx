/* 로그인/가입 공용 셸 — 좌우 스플릿 (좌: 네이비 브랜드 패널 / 우: 흰 폼).
   noct-studio 로그인 레퍼런스 구조를 운동선수 수면 코칭으로. */

const AUTH_CSS = `
html,body{overflow-x:hidden;max-width:100%;}
.noct-auth{--indigo:#4355B0;--navy:#0D1B2A;--ink:#111;--gray:#6b7280;--gray2:#9aa3ad;--line:#e6e7eb;
  font-family:'Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,sans-serif;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color:var(--ink);overflow-x:hidden;}
.noct-auth .split{display:flex;min-height:100vh;}

/* 좌 — 브랜드 */
.noct-auth .left{flex:1;min-width:0;position:relative;overflow:hidden;color:#fff;
  background:linear-gradient(155deg,#0D1B2A 0%,#1b2b56 100%);
  padding:44px 52px;display:flex;flex-direction:column;justify-content:space-between;}
.noct-auth .left::after{content:"";position:absolute;right:-140px;top:-120px;width:440px;height:440px;border-radius:50%;
  background:radial-gradient(circle,rgba(126,200,227,.20),transparent 70%);pointer-events:none;}
.noct-auth .brand{display:flex;align-items:center;gap:10px;position:relative;z-index:1;}
.noct-auth .brand img{height:20px;filter:brightness(0) invert(1);opacity:.95;}
.noct-auth .lmid{position:relative;z-index:1;max-width:430px;}
.noct-auth .eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;
  color:#c4e7f5;background:rgba(126,200,227,.12);border:1px solid rgba(126,200,227,.34);
  padding:6px 13px;border-radius:999px;margin-bottom:22px;letter-spacing:.2px;}
.noct-auth .htitle{font-size:34px;font-weight:800;line-height:1.28;letter-spacing:-.8px;}
.noct-auth .hdesc{font-size:14.5px;line-height:1.65;color:rgba(255,255,255,.68);margin-top:16px;}
.noct-auth .fchips{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px;}
.noct-auth .fchip{font-size:12.5px;font-weight:600;color:rgba(255,255,255,.82);
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);padding:7px 13px;border-radius:999px;}
.noct-auth .lfoot{position:relative;z-index:1;font-size:12.5px;color:rgba(255,255,255,.45);font-weight:500;}

/* 우 — 폼 */
.noct-auth .right{flex:1;min-width:0;background:#fff;display:flex;align-items:center;justify-content:center;padding:44px 40px;}
.noct-auth .form-wrap{width:100%;max-width:360px;}
.noct-auth h1{font-size:22px;font-weight:800;color:var(--navy);letter-spacing:-.4px;}
.noct-auth .lead{font-size:13.5px;color:var(--gray);margin-top:7px;margin-bottom:24px;line-height:1.55;}
.noct-auth form{display:flex;flex-direction:column;gap:15px;}
.noct-auth label{display:block;font-size:12.5px;font-weight:600;color:#4a5160;margin-bottom:7px;}
.noct-auth input{width:100%;border:1.5px solid var(--line);border-radius:12px;padding:13px 14px;font-size:15px;
  color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;background:#fff;}
.noct-auth input::placeholder{color:#c4c8d0;}
.noct-auth input:focus{border-color:var(--indigo);box-shadow:0 0 0 3px rgba(67,85,176,.12);}
.noct-auth .btn{width:100%;margin-top:6px;background:var(--indigo);color:#fff;border:none;border-radius:12px;
  padding:14px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .15s,opacity .15s;
  display:flex;align-items:center;justify-content:center;gap:8px;}
.noct-auth .btn:hover{background:#37469a;}
.noct-auth .btn:disabled{opacity:.6;cursor:default;}
.noct-auth .err{color:#b23b30;font-size:13px;font-weight:500;line-height:1.5;background:rgba(244,151,142,.12);
  border:1px solid rgba(244,151,142,.42);border-radius:10px;padding:10px 12px;}
.noct-auth .alt{text-align:center;font-size:13px;color:var(--gray);margin-top:20px;}
.noct-auth .alt a{color:var(--indigo);font-weight:700;text-decoration:none;}
.noct-auth .hint{font-size:12.5px;color:var(--gray2);margin-top:16px;text-align:center;line-height:1.55;}

/* 모바일 — 세로 스택 (네이비 상단 밴드 + 흰 폼) */
@media (max-width:860px){
  .noct-auth .split{display:block;min-height:0;}
  .noct-auth .left{padding:38px 26px 48px;justify-content:flex-start;}
  .noct-auth .brand{margin-bottom:30px;}
  .noct-auth .htitle{font-size:27px;}
  .noct-auth .hdesc{display:block;font-size:14px;margin-top:14px;color:rgba(255,255,255,.72);}
  .noct-auth .fchips{margin-top:20px;}
  .noct-auth .fchip{font-size:12px;padding:6px 11px;}
  .noct-auth .lfoot{display:none;}
  .noct-auth .lmid{max-width:none;}
  .noct-auth .right{flex:1 0 auto;padding:32px 24px 48px;align-items:flex-start;
    border-radius:26px 26px 0 0;margin-top:-24px;position:relative;z-index:2;
    box-shadow:0 -10px 30px rgba(13,27,42,.14);}
  .noct-auth .form-wrap{max-width:none;}
}
`;

export default function AuthShell({ children }) {
  return (
    <div className="noct-auth">
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
      <div className="split">
        <aside className="left">
          <div className="brand">
            <img src="/noct-logo.png" alt="NOCT RESEARCH" />
          </div>
          <div className="lmid">
            <h2 className="htitle">
              Better Sleep,
              <br />
              Better Performance
            </h2>
            <p className="hdesc">
              수면·훈련 데이터를 한곳에서 관리하고, 전문 코치의 맞춤 솔루션으로
              최상의 컨디션을 설계합니다.
            </p>
            <div className="fchips">
              <span className="fchip">사전 수면 진단</span>
              <span className="fchip">수면·훈련 데이터</span>
              <span className="fchip">맞춤 회복 리포트</span>
              <span className="fchip">1:1 전문 코칭</span>
            </div>
          </div>
          <div className="lfoot">© NOCT Research · 운동선수 수면 코칭</div>
        </aside>

        <main className="right">
          <div className="form-wrap">{children}</div>
        </main>
      </div>
    </div>
  );
}
