# -*- coding: utf-8 -*-
"""리포트 엔진 · 렌더러 (snapshot + config + narrative → report.html)
- 숫자·차트는 snapshot에서 계산(하드코딩 X). 대표값 = 중앙값 + IQR(편차).
- 해석 문장(prose)은 narrative.json 슬롯에서만. 사람별 하드코딩 X.
- 섹션 순서·구간은 config에서. 사용: python3 render.py reports/<name>/config.json
"""
import json, statistics as st, os, sys, html as H

CFG = sys.argv[1]
BASE = os.path.dirname(os.path.abspath(CFG))
ENGINE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(CFG, encoding="utf-8"))
snap = json.load(open(os.path.join(BASE, "snapshot.json"), encoding="utf-8"))
nar = json.load(open(os.path.join(BASE, "narrative.json"), encoding="utf-8"))
_rdp = os.path.join(BASE, "redesign.json")
RD = json.load(open(_rdp, encoding="utf-8")) if os.path.exists(_rdp) else {}
CSS = open(os.path.join(ENGINE, "theme.css"), encoding="utf-8").read()
N = snap["nights"]
SEGS = cfg["segments"]  # [{label,range,color}]
nSegWith = sum(1 for s in SEGS if any(n.get("seg") == s["label"] for n in N))  # 기록 있는 구간 수 (타일 칸 수)


# ── 통계 헬퍼 ──
def cont(b):            # 취침 연속화(자정=0, 저녁=음수)
    return b if b < 720 else b - 1440
def seg_nights(label): return [n for n in N if n.get("seg") == label]
def sd_bed(rows):  return st.pstdev([cont(n["bedMin"]) for n in rows]) if len(rows) > 1 else 0
def med_tst(rows): return st.median([n["tstHours"] for n in rows]) if rows else 0
def pct_lt6(rows): return sum(n["tstHours"] < 6 for n in rows) / len(rows) * 100 if rows else 0
def pct_wake0(rows): return sum(n["wakeCount"] == 0 for n in rows) / len(rows) * 100 if rows else 0
def iqr(rows):
    v = sorted(n["tstHours"] for n in rows)
    if len(v) < 4: return (v[0], v[-1]) if v else (0, 0)
    q = st.quantiles(v, n=4)
    return (q[0], q[2])

def hm(hours):            # 6.5 → "6시간 30분", 5.0 → "5시간" (소수점·박 안 씀)
    m = int(round(hours * 60)); h, mm = divmod(m, 60)
    return f"{h}시간 {mm}분" if mm else f"{h}시간"
def hmin(m):              # 분 입력 → "1시간 17분" / "45분" (취침 편차 등)
    m = int(round(m)); h, mm = divmod(m, 60)
    return (f"{h}시간 {mm}분" if mm else f"{h}시간") if h else f"{mm}분"
def hm10(hours):          # 편차 표시용: 10분 단위 반올림
    m = int(round(hours * 60 / 10) * 10); h, mm = divmod(m, 60)
    return f"{h}시간 {mm}분" if mm else f"{h}시간"

allTst = [n["tstHours"] for n in N]
medTstExact = st.median(allTst)
wcMean = round(st.mean([n["wakeCount"] for n in N if n["wakeCount"] is not None]), 1)
medTst = round(medTstExact, 1)
q1, q3 = iqr(N)
solOk = sum((n["sol"] in ("바로 잠들어요", "15분 이내")) for n in N)
solPct = round(solOk / len(N) * 100)
alc = [n for n in N if n["alcohol"]]
non = [n for n in N if not n["alcohol"]]
anom = [n for n in N if n["awakeBucket"] == "1시간 이상"]
cpapOff = [n for n in N if n["cpap"] in ("removed", "none")]
naps = [n for n in N if n.get("nap")]
trains = [n for n in N if n.get("training")]

# narrative에서 계산값 참조용 치환 토큰
VARS = {
    "N": len(N), "medTst": medTst, "q1": round(q1, 1), "q3": round(q3, 1),
    "solPct": solPct, "wake0": round(pct_wake0(N)), "nAlc": len(alc),
    "nAnom": len(anom), "nCpapOff": len(cpapOff), "nNap": len(naps), "nTrain": len(trains),
}
def fill(s):  # narrative 문자열 안 {token} 치환 (없는 토큰은 그대로 둠)
    if not s: return ""
    for k, v in VARS.items(): s = s.replace("{" + k + "}", str(v))
    return s


# ── 차트 헬퍼 (config.segments 기반 범용) ──
def bars(valfn, dispfn):
    rows = [(s, seg_nights(s["label"])) for s in SEGS]
    mx = max((valfn(r) for _, r in rows if r), default=1) or 1
    out = ""
    for s, r in rows:
        if not r: continue
        v = valfn(r); h = round(v / mx * 100)
        out += (f'<div class="bcol"><div class="bval">{dispfn(v)}</div>'
                f'<div class="bfill" style="height:{h}%;background:{s["color"]}"></div>'
                f'<div class="bx">{s["label"]}</div><div class="bsub">{seg_lbl(s)} · {len(r)}일</div></div>')
    return out
BAR_MIN = lambda v: f'{v:.0f}<small style="font-size:11px">분</small>'

def seg_lbl(s):
    a, b = s["range"]; return f'{int(a[5:7])}/{int(a[8:10])}~{int(b[5:7])}/{int(b[8:10])}'

def tiles_wake():
    out = ""
    for s in SEGS:
        r = seg_nights(s["label"])
        if not r: continue
        out += (f'<div class="tile"><div class="tv">{pct_wake0(r):.0f}<small>%</small></div>'
                f'<div class="tn">{s["label"]}</div><div class="tb">{seg_lbl(s)} · {len(r)}일</div></div>')
    return out

def tiles_lt6():
    out = ""
    for s in SEGS:
        r = seg_nights(s["label"])
        if not r: continue
        p = pct_lt6(r); cls = "s-b" if p >= 50 else ("s-w" if p >= 20 else "")
        out += (f'<div class="tile"><div class="tv {cls}">{p:.0f}<small>%</small></div>'
                f'<div class="tn">{s["label"]}</div><div class="tb">{seg_lbl(s)}</div></div>')
    return out

def bed_scatter():
    W, H_, padL, padR, padT, padB = 880, 320, 46, 16, 26, 40
    plotH = H_ - padT - padB
    vals = [cont(n["bedMin"]) for n in N]
    lo, hi = min(vals) - 20, max(vals) + 20
    Y = lambda v: padT + (v - lo) / (hi - lo) * plotH
    X = lambda i: padL + i / (len(N) - 1) * (W - padL - padR)
    colmap = {s["label"]: s["color"] for s in SEGS}
    # 강조 밴드 = usBand(날짜범위, 세그먼트와 무관) 우선, 없으면 usSegment
    band = ""
    ub = cfg.get("usBand")   # {"label": "미국", "range": ["YYYY-MM-DD","YYYY-MM-DD"]}
    us = cfg.get("usSegment")
    if ub:
        idx = [i for i, n in enumerate(N) if ub["range"][0] <= n["date"] <= ub["range"][1]]
        blab = ub.get("label", "")
    elif us:
        idx = [i for i, n in enumerate(N) if n.get("seg") == us]
        blab = us
    else:
        idx, blab = [], ""
    if idx:
        x1, x2 = X(idx[0]) - 6, X(idx[-1]) + 6
        col = "#4355B0"  # 주목 구간(체류)만 브랜드 틴트
        band = (f'<rect x="{x1:.0f}" y="{padT}" width="{x2-x1:.0f}" height="{plotH}" fill="{col}" opacity="0.07"/>'
                f'<text x="{(x1+x2)/2:.0f}" y="{padT+11}" fill="{col}" font-size="10" font-weight="800" text-anchor="middle">{blab} 체류</text>')
    # 시각 눈금 (자정=0 기준 매시 정각, 밤 시각 라벨)
    ticks = ""
    for hh in range(-8, 9):
        v = hh * 60
        if v < lo or v > hi: continue
        yy = Y(v)
        lab = "자정" if hh == 0 else f"{((hh + 24) % 24) % 12 or 12}시"
        emph = hh == 0
        dash = ' stroke-dasharray="3 3"' if emph else ''
        col = "#cfd4de" if emph else "#eef0f3"
        ticks += (f'<line x1="{padL}" y1="{yy:.0f}" x2="{W-padR}" y2="{yy:.0f}" stroke="{col}"{dash}/>'
                  f'<text x="{padL-6}" y="{yy+3:.0f}" fill="#9aa0aa" font-size="9" text-anchor="end">{lab}</text>')
    dots = "".join(f'<circle cx="{X(i):.0f}" cy="{Y(cont(n["bedMin"])):.0f}" r="5" fill="#5b6472"/>' for i, n in enumerate(N))
    legend = "".join(f'<span><i style="background:{s["color"]}"></i>{s["label"]}</span>' for s in SEGS)
    return (f'<svg viewBox="0 0 {W} {H_}" width="100%" preserveAspectRatio="xMidYMid meet">{band}{ticks}{dots}</svg>',
            legend)

def routine_rows():  # 낮잠·운동 밤별 나열 (8/12+ 관찰)
    out = ""
    for n in N:
        if not (n.get("nap") or n.get("training")): continue
        parts = []
        if n.get("nap"): parts.append(f'낮잠 {H.escape(str(n["nap"]))}')
        if n.get("training"): parts.append(f'운동 {H.escape(str(n["training"]))}')
        d = n["date"][5:].replace("-", "/")
        out += f'<div class="drow"><span class="dd">{d}</span><span class="dv">' + " · ".join(parts) + "</span></div>"
    return out

def alc_rows():
    out = ""
    for n in alc:
        extra = "" if n["awakeBucket"] == "안깸" else f'각성 {n["awakeBucket"]} · '
        out += (f'<div class="drow"><span class="dd">{n["date"][5:].replace("-","/")}</span>'
                f'<span class="dv">{extra}총수면 {hm(n["tstHours"])}</span></div>')
    return out


# ── 섹션 렌더러 ──
def shead(s):
    b = s.get("badge")
    badge = f'<span class="badge {b[0]}">{b[1]}</span>' if b else ""
    desc = f'<div class="desc">{fill(s["desc"])}</div>' if s.get("desc") else ""
    base = f'<div class="base">기준 : {fill(s["base"])}</div>' if s.get("base") else ""
    return (f'<div class="shead">'
            f'<div class="htop"><h2>{fill(s["title"])}</h2>{badge}</div>{desc}{base}</div>')

# ── 상세 지표 공통 문법 (핸드오버 2026-09-08): Period Comparison + Coach Insight ──
REF_MAX = 4  # 표본 N일 이하 = 참고 데이터

def prows(valuefn, segNotes=None):  # 시기별 비교 행 (세그먼트 색 없음, 값 우선, 3일=참고 배지)
    out = ""
    for s in SEGS:
        r = seg_nights(s["label"])
        if not r: continue
        refb = len(r) <= REF_MAX
        rb = '<span class="refbadge">참고 데이터</span>' if refb else ""
        note = (segNotes or {}).get(s["label"])
        nh = f'<div class="pnote">{fill(note)}</div>' if note else ""
        out += (f'<div class="prow{" ref" if refb else ""}">'
                f'<div class="prow-l"><span class="plabel">{s["label"]}</span>'
                f'<div class="pdate">{seg_lbl(s)} · {len(r)}일{rb}</div>{nh}</div>'
                f'<span class="pvalue">{valuefn(r)}</span></div>')
    return f'<div class="pcomp">{out}</div>'

def cins(metric):  # Coach Insight = 한 줄 결론 + 짧은 근거 (RD.analysis, 검증된 텍스트)
    a = RD.get("analysis", {}).get(metric, {})
    body = (a.get("insight", "") + ((" " + a["detail"]) if a.get("detail") else "")).strip()
    return f'<div class="cins"><div class="cins-h">코치 해석</div><div class="cins-b">{fill(body)}</div></div>' if body else ""

def sec_규칙성():
    s = nar["규칙성"]; svg, leg = bed_scatter()
    bl = (cfg.get("usBand") or {}).get("label") or cfg.get("usSegment")
    blnote = f" · 색이 진한 기간이 {bl} 체류" if bl else ""
    return f'''<section class="block">{shead(s)}
    {prows(lambda r: hmin(sd_bed(r)), s.get("segNotes"))}
    <div class="tcap">취침 시각 분포</div>
    <div class="card scatterwrap">{svg}
      <div class="llegend"><span style="color:#9aa0aa">점 하나 = 하룻밤 취침 시각{blnote}</span></div></div>
    {cins("규칙성")}
  </section>'''

def sec_각성():
    s = nar["각성"]
    return f'''<section class="block">{shead(s)}
    <div class="mlead">밤에 평균 {wcMean}회 깼어요</div>
    <div class="mcap">각성 없이 잔 날 {pct_wake0(N):.0f}% · 깬 날도 대부분 10분 안쪽이었어요</div>
    {prows(lambda r: f"{pct_wake0(r):.0f}%", s.get("segNotes"))}
    {cins("각성")}</section>'''

def sec_총수면():
    s = nar["총수면"]
    cells = "".join(f'<div class="smcell"><b>{pct_lt6(seg_nights(x["label"])):.0f}%</b><span>{x["label"]}</span></div>'
                    for x in SEGS if seg_nights(x["label"]))
    return f'''<section class="block">{shead(s)}
    {prows(lambda r: hm(med_tst(r)), s.get("segNotes"))}
    <div class="secmetric"><div class="sm-h">6시간 미만 수면</div><div class="sm-vals">{cells}</div></div>
    {cins("총수면")}</section>'''

def sec_루틴관찰():
    s = nar["루틴관찰"]
    return f'''<section class="block">{shead(s)}
    <div class="ibox">
      {routine_rows()}
      <div class="dnote">{fill(s.get("note",""))}</div></div></section>'''

def cmp_card(label, rows):
    return (f'<div class="ibox"><div class="ih2">{label} · {len(rows)}일</div>'
            f'<div class="cmprow"><span>수면 중 각성 없는 날</span><b>{pct_wake0(rows):.0f}%</b></div>'
            f'<div class="cmprow"><span>총수면 중앙값</span><b>{hm(med_tst(rows))}</b></div></div>')

def sec_음주양압기():
    s = nar["음주양압기"]
    al = s["alcoholSummary"]
    cpap = "".join(
        f'<div class="wl"><span class="wd"></span><div class="wt"><b>{fill(l["title"])}</b>'
        f'<div class="wsub">{fill(l["desc"])}</div><span class="src">{H.escape(l["src"])}</span></div></div>'
        for l in s["cpapLines"])
    cpap2 = "".join(f'<div class="factline"><div class="fl-t">{fill(l["title"])}</div>'
                    f'<div class="fl-s">{fill(l["desc"])}<span class="src">{H.escape(l["src"])}</span></div></div>' for l in s["cpapLines"])
    return f'''<section class="block">{shead(s)}
    <div class="subhead">음주 · 마신 날과 안 마신 날 비교</div>
    <div class="interp">{cmp_card("술 마신 날", alc)}{cmp_card("안 마신 날", non)}</div>
    <div class="factnote">{fill(al["text"])}<span class="src">{H.escape(al["src"])}</span></div>
    <div class="subhead" style="margin-top:22px">양압기</div>
    <div class="factcard">{cpap2}</div></section>'''

def sec_도움효과():  # 도움이 된 것 · 안 된 것 (2차+3차 합친 표준: 항목→효과+근거)
    s = nar["도움효과"]
    def rows(items, col):
        return "".join(
            f'<div class="il"><span class="ick" style="background:{col}"></span>'
            f'<div class="it"><b>{fill(i["what"])}</b>'
            f'<div class="isub">{fill(i["effect"])}</div>'
            f'<span class="src">{H.escape(i["src"])}</span></div></div>' for i in items)
    return f'''<section class="block">{shead(s)}
    <div class="interp">
      <div class="ibox good"><div class="ih"><i></i>도움이 된 것</div>{rows(s.get("helped", []), "#8fce9f")}</div>
      <div class="ibox bad"><div class="ih"><i></i>안 된 것 · 주의</div>{rows(s.get("hurt", []), "#e0a89c")}</div>
    </div></section>'''

def sec_watch():
    s = nar["watch"]
    items = "".join(
        f'<div class="wl"><span class="wd"></span><div class="wt"><b>{fill(i["title"])}</b>'
        f'<div class="wsub">{fill(i["desc"])}</div><span class="src">{H.escape(i["src"])}</span></div></div>'
        for i in s["items"])
    return f'''<section class="block">{shead(s)}<div class="watch">{items}</div></section>'''

def sec_plan():
    s = nar["plan"]
    steps = ""
    for i, st_ in enumerate(s["steps"], 1):
        steps += (f'<div class="bigstep"><div class="bn">{i}</div><div>'
                  f'<div class="bwhen">{fill(st_["when"])}</div><div class="bt">{fill(st_["title"])}</div>'
                  f'<div class="bd">{fill(st_["body"])}</div></div></div>')
    return f'''<section class="block">{shead(s)}{steps}</section>'''

def sec_safety():
    return ""  # watch가 의료연계 담당(중복 방지). config에 safety 있으면 watch로 흡수.

# ── v2 컴포넌트 (핸드오버 2026-09-08): 역할별 UI ──
def badge2(kind):
    m = {"양호": "g", "주의": "w", "안정적": "b", "관찰": "o", "개선 중": "b"}
    return f'<span class="badge {m.get(kind,"b")}">{kind}</span>'

def sec_jonghap():  # 종합 소견 (풍부한 요약: 현황 + 좋아진 점/주의할 점 + 다음 과제)
    imp = nar["impression"]; sm = RD.get("summary", {})
    return f'''<section class="sec block"><div class="sh">종합 소견</div>
    <div class="impression">
      <p class="imp-lead">{fill(imp["lead"])}</p>
      <div class="imp-rows">
        <div class="imp-row"><span class="imp-tag good">좋아진 점</span><span class="imp-txt">{fill(imp["good"]["text"])}</span></div>
        <div class="imp-row"><span class="imp-tag warn">주의할 점</span><span class="imp-txt">{fill(imp["shaken"]["text"])}</span></div>
      </div>
      <div class="imp-next">{fill(sm.get("subcopy",""))}</div>
    </div></section>'''

def sec_summary():  # 현재 상태 = Summary Banner (결론 먼저)
    s = RD.get("summary", {})
    return f'''<section class="sec block"><div class="banner">
      <div class="bnr-ic">🌙</div>
      <div class="bnr-body">{badge2(s.get("status","안정적"))}
        <div class="bnr-main">{H.escape(s.get("insight",""))}</div>
        <div class="bnr-sub">{H.escape(s.get("subcopy",""))}</div></div></div></section>'''

def dchip(cur, prev, unit, lower_better=False):  # 변화량 칩 (직전 기간 대비, 화살표+숫자)
    if prev is None: return ""
    d = round(cur - prev)
    if d == 0: return '<span class="dchip flat">변화 없음</span>'
    good = (d < 0) if lower_better else (d > 0)
    return f'<span class="dchip {"up" if good else "down"}">{"↑" if d>0 else "↓"}{abs(d)}{unit}</span>'

def sec_keymetrics():  # 핵심 데이터 = Stat Card (+ 직전 기간 대비 변화량)
    sdAll = round(sd_bed(N))
    cmp = RD.get("compare", {})
    stats = [("총 수면시간", hm(medTstExact), "주의", dchip(round(medTstExact*60), cmp.get("총수면_prev분"), "분")),
             ("수면 중 각성 없는 날", f"{pct_wake0(N):.0f}%", "양호", dchip(round(pct_wake0(N)), cmp.get("각성없는날_prev"), "%p")),
             ("취침 편차", hmin(sdAll), "주의", dchip(sdAll, cmp.get("취침편차_prev분"), "분", lower_better=True))]
    cards = "".join(f'<div class="strow"><div class="stat-l">{l}</div>'
                    f'<div class="stat-rr"><span class="stat-v">{v}</span>{d}{badge2(st_)}</div></div>' for l, v, st_, d in stats)
    lbl = cmp.get("label", "")
    return f'''<section class="sec block"><div class="sh">핵심 지표</div><div class="statcard">{cards}</div>
      {f'<div class="note-s">{H.escape(lbl)}</div>' if lbl else ''}</section>'''

def sec_factors():  # 도움·방해 요인 = 칩
    fc = RD.get("factors", {})
    chips = lambda arr, c: "".join(f'<span class="chip {c}">{H.escape(x)}</span>' for x in arr)
    return f'''<section class="sec block"><div class="sh">이번 기간 수면에 영향을 준 것</div>
      <div class="fcard">
        <div class="fgrp"><div class="fg-h fg-good">도움이 됐어요</div><div class="chips">{chips(fc.get("helped",[]),"good")}</div></div>
        <div class="fgrp"><div class="fg-h fg-bad">방해가 됐어요</div><div class="chips">{chips(fc.get("hurt",[]),"bad")}</div></div>
      </div></section>'''

def sec_coachnote():  # 전문가 해석 = Coach Note (H2 제목 + 저강도 카드)
    return f'''<section class="sec block"><div class="sh">코치 소견</div>
      <div class="coach"><div class="coach-b">{H.escape(RD.get("coachNote",""))}</div></div></section>'''

def sec_action():  # 이번 주 행동 = Action Card (아래로)
    acts = RD.get("actions", [])
    rows = "".join(f'<div class="arow"><div class="anum">{i:02d}</div><div class="atxt">'
                   f'<div class="at">{H.escape(a["title"])}</div><div class="asub">{H.escape(a["sub"])}</div></div></div>'
                   for i, a in enumerate(acts, 1))
    return f'''<section class="sec block"><div class="sh">이번 주 할 일</div>
      <div class="acard"><div class="acard-h">이번 주에는 이것만 해주세요</div>{rows}</div></section>'''

def sec_goal():  # 다음 목표 = Goal Card
    gs = RD.get("goals", [])
    rows = "".join(f'<div class="grow"><div class="gnum">{i:02d}</div><div class="gtxt"><div class="gl">{H.escape(g["label"])}</div>'
                   f'<div class="gv">{("현재 "+H.escape(g["from"])+" · 목표 " if g.get("from") else "목표 ")}<b>{H.escape(g["to"])}</b></div></div></div>'
                   for i, g in enumerate(gs, 1))
    return f'''<section class="sec block"><div class="sh">앞으로의 목표</div><div class="gcard">{rows}</div></section>'''

RENDER = {"jonghap": sec_jonghap, "summary": sec_summary, "keymetrics": sec_keymetrics,
          "규칙성": sec_규칙성, "각성": sec_각성, "총수면": sec_총수면,
          "루틴관찰": sec_루틴관찰, "음주양압기": sec_음주양압기, "도움효과": sec_도움효과,
          "factors": sec_factors, "coachnote": sec_coachnote,
          "watch": sec_watch, "plan": sec_plan, "action": sec_action, "goal": sec_goal, "safety": sec_safety}


# ── 히어로 + 종합소견 ──
imp = nar["impression"]
kpi_spread = f'대부분 {int(round(q1))}~{int(round(q3))}시간'
_sm = RD.get("summary", {})
_per = f'{cfg["period"]["start"].replace("-",".")} – {cfg["period"]["end"][5:].replace("-",".")}'
hero = f'''<div class="hero block"><div class="pad">
    <div class="eyebrow">수면 코칭 경과 리포트</div>
    <div class="titrow"><h1>{H.escape(cfg["title"])}</h1><span class="pill">{_per}</span></div>
    <div class="who">{H.escape(cfg["who"])}</div>
    <div class="date">상담 {cfg.get("sessionRef","-")}회차 기준</div></div>
  <div class="kpis">
    <div class="kpi"><div class="v tabnum">{len(N)}<small>일</small></div><div class="k">기록일수</div></div>
    <div class="kpi"><div class="v tabnum" style="font-size:18px">{hm(medTstExact)}</div><div class="k">총수면 중앙값</div></div>
    <div class="kpi"><div class="v tabnum">{solPct}<small>%</small></div><div class="k">15분 이내 입면율</div></div>
    <div class="kpi"><div class="v tabnum">{pct_wake0(N):.0f}<small>%</small></div><div class="k">수면 중 각성 없는 날</div></div>
  </div></div>'''

impression = f'''<section class="impression block">
    <p style="font-size:15.5px;line-height:1.6;color:var(--fg);margin-top:2px;font-weight:600">{fill(imp["lead"])}</p>
    <div style="margin-top:15px;display:flex;flex-direction:column;gap:9px">
      <div style="display:flex;gap:10px;align-items:flex-start"><span style="flex:none;font-size:12px;font-weight:800;color:#1f8a4c;background:#e7f4ec;border-radius:6px;padding:4px 9px;min-width:66px;text-align:center">좋아진 점</span><span style="font-size:14px;line-height:1.55;color:#3a3f52">{fill(imp["good"]["text"])}</span></div>
      <div style="display:flex;gap:10px;align-items:flex-start"><span style="flex:none;font-size:12px;font-weight:800;color:#b9770e;background:#fbf3e6;border-radius:6px;padding:4px 9px;min-width:66px;text-align:center">주의할 점</span><span style="font-size:14px;line-height:1.55;color:#3a3f52">{fill(imp["shaken"]["text"])}</span></div>
    </div></section>'''

body = hero + "".join(RENDER[name]() for name in cfg["sections"] if name in RENDER)

HTML = f'''<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{H.escape(cfg["who"])} · {H.escape(cfg["title"])}</title>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">
<style>{CSS}</style></head><body>
<div class="appbar"><a href="/reports" class="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>리포트</a></div>
<div class="wrap">{body}
  <div class="footlogo"><i></i>NOCT RESEARCH · 김소정 IPHI 인증 국제수면코치</div>
  <div class="disc">{fill(nar.get("disc",""))}</div>
</div>
<nav class="appnav">
  <a href="/portal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg><span>홈</span></a>
  <a href="/log"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg><span>기록</span></a>
  <a href="/reports" class="on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M8 13h8M8 17h8"/></svg><span>리포트</span></a>
  <a href="/me"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>내정보</span></a>
</nav></body></html>'''

out = os.path.join(BASE, "report.html")
open(out, "w", encoding="utf-8").write(HTML)
print(f"✅ {out}")
print(f"   중앙 총수면 {medTst}h (IQR {VARS['q1']}~{VARS['q3']}) · 입면15분 {solPct}% · 각성0회 {pct_wake0(N):.0f}% · 술밤 {len(alc)} · 1h+각성 {len(anom)} · 양압기이탈 {len(cpapOff)} · 낮잠 {len(naps)} · 운동 {len(trains)}")
for s in SEGS:
    r = seg_nights(s["label"])
    if r: print(f"   {s['label']}({len(r)}박): 취침SD {sd_bed(r):.0f}분 · TST중앙 {med_tst(r):.2f}h · 6h미만 {pct_lt6(r):.0f}% · 각성0회 {pct_wake0(r):.0f}%")
