#!/usr/bin/env node
// 이지수님 기존 수면일지(구글시트) → Neon logs 마이그레이션.
// 소스 2개:
//   ① 메인시트 v2 (scripts/data/jisoo-main.csv) — ☀️아침(수면) + 🌙저녁(루틴), 기상일 3/18~8/11
//   ② 구시트 (아래 OLD_ROWS 하드코딩) — 초기 간단폼, 기상일 3/5~3/17
//
// 날짜 규칙(Emma 확정): sleep.date = "취침일(전날)" = 기상아침 날짜 − 1.
//   아침에 적은 기록은 전날 밤 수면 → 그날(낮 루틴)과 그날 밤 수면이 같은 날짜에 모임.
//   ⚠️ 지수님 앱 직접기록 3건(8/12·8/13·8/15)은 기상일 기준이라 규칙 다름(겹침 없음).
// 저녁(루틴)기록: 그날 낮 활동이므로 date 그대로(= 그날 밤 수면과 같은 날짜에 정합).
//
// 실행:  node scripts/migrate-jisoo-logs.mjs           (dry-run, 출력만)
//        node scripts/migrate-jisoo-logs.mjs --commit  (Neon insert, 중복 skip)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f); if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const COMMIT = process.argv.includes("--commit");
const EMAIL = "yijisoo@gmail.com";

// ── 라벨 맵(앱 SleepWizard/LogTimeline과 일치) ──
const SOL = ["바로 잠들어요", "15분 이내", "30분쯤", "1시간쯤", "1시간 이상"];
const WASO = ["10분 이내", "30분쯤", "1시간쯤", "1시간 이상"];
const OUT = ["바로 나왔어요", "10분 이내", "30분쯤", "1시간쯤", "1시간 이상"];

// "오후 10:00" / "오전 12:30" / "23:00" / "23 00" / "5:30" → 분(0~1439). 실패 null.
function toMin(s) {
  if (!s) return null;
  s = String(s).trim().replace(/\s+/g, " ");
  const ap = /(오전|오후)/.exec(s);
  const m = /(\d{1,2})\s*[:\s]\s*(\d{2})/.exec(s) || /(\d{1,2})\s*시\s*(\d{1,2})?/.exec(s);
  if (!m) return null;
  let h = +m[1], mi = m[2] ? +m[2] : 0;
  if (ap) { if (ap[1] === "오후" && h < 12) h += 12; if (ap[1] === "오전" && h === 12) h = 0; }
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}
const hhmm = (m) => m == null ? null : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const kstAdd = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

// 입면 분 → SOL 라벨
function solLabel(x) {
  const n = parseInt(String(x).replace(/[^\d]/g, ""), 10);
  if (isNaN(n)) return null;
  if (n <= 4) return SOL[0]; if (n <= 15) return SOL[1]; if (n <= 40) return SOL[2]; if (n <= 75) return SOL[3]; return SOL[4];
}
// 중간각성시간 라벨 정규화("10분 이하"→"10분 이내", "10~30분"→"30분쯤", "30분~1시간"→"1시간쯤")
function wasoLabel(x) {
  if (!x) return null; const s = String(x);
  if (/1시간\s*이상/.test(s)) return WASO[3];
  if (/30분\s*~\s*1시간|30분~1시간/.test(s)) return WASO[2];
  if (/10\s*~\s*30|10~30/.test(s)) return WASO[1];
  if (/10분\s*(이하|이내)/.test(s)) return WASO[0];
  if (/1시간/.test(s)) return WASO[2];
  return WASO[0];
}
// 밤중각성 횟수 → 정수
function wokeCount(x) {
  if (!x) return 0; const s = String(x);
  if (/안\s*깸|0번/.test(s)) return 0;
  const m = /(\d+)\s*번/.exec(s); return m ? +m[1] : 0;
}
// 침대나온 라벨 (기상~침대밖 gap 분)
function outLabel(gap) {
  if (gap == null) return null;
  if (gap <= 2) return OUT[0]; if (gap <= 10) return OUT[1]; if (gap <= 40) return OUT[2]; if (gap <= 75) return OUT[3]; return OUT[4];
}

// ── CSV 파서 (따옴표·콤마·개행 대응) ──
function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ",") { row.push(cur); cur = ""; } else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; } else if (c !== "\r") cur += c; }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const sleeps = [], routines = [];
const addRoutine = (date, time, type, detail, dur) => { if (time == null) return; routines.push({ date, data: { time: hhmm(time), type, detail: detail || "", dur: dur || null }, summary: `${{ training: "훈련", caffeine: "카페인", nap: "낮잠", meal: "식사", alcohol: "술", etc: "기타" }[type]}${detail ? " · " + detail : ""}${dur ? " · " + dur : ""}` }); };

// ── ① 메인시트 파싱 ──
const csv = parseCSV(readFileSync(join(ROOT, "scripts/data/jisoo-main.csv"), "utf8"));
for (let r = 2; r < csv.length; r++) {
  const c = csv[r]; if (!c) continue;
  // 아침(수면): col0=날짜 ~ col9=메모
  const amDate = (c[0] || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(amDate)) {
    const bed = toMin(c[2]), wake = toMin(c[8]);
    if (bed != null && wake != null) {
      const sol = solLabel(c[3]);
      const woke = wokeCount(c[4]);
      const waso = woke > 0 ? wasoLabel(c[5]) : null;
      const reason = [c[6], c[7]].map((x) => (x || "").trim()).filter(Boolean).join("/");
      const memo = [(c[9] || "").trim(), reason ? `각성이유: ${reason}` : ""].filter(Boolean).join(" · ");
      sleeps.push({ date: kstAdd(amDate, -1), data: { bed, wake, sol, outbed: null, woke, waso, feel: [], memo }, summary: `취침 ${hhmm(bed)} · 입면 ${sol || "-"} · 기상 ${hhmm(wake)} · 밤중깸 ${woke}회${waso ? ` (${waso})` : ""}` });
    }
  }
  // 저녁(루틴): col11=날짜 ~ col23=메모
  const pmDate = (c[11] || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(pmDate)) {
    if (/네/.test(c[13] || "")) addRoutine(pmDate, 14 * 60, "nap", "", (c[14] || "").trim());          // 낮잠 (시각불명 → 14:00)
    if (/네/.test(c[15] || "")) addRoutine(pmDate, toMin(c[16]) ?? 13 * 60, "caffeine", "마지막", null); // 카페인 (마지막시간 있으면 사용)
    if (/네/.test(c[17] || "")) addRoutine(pmDate, 21 * 60, "alcohol", (c[18] || "").trim(), null);       // 음주 (시각불명 → 21:00)
    if (/네/.test(c[19] || "")) addRoutine(pmDate, 22 * 60, "etc", (c[20] || "").trim() || "수면보조제", null); // 보조제 (취침전 → 22:00)
    const exWhen = (c[22] || "").trim();
    if (/네/.test(c[21] || "")) addRoutine(pmDate, /오후|저녁/.test(exWhen) ? 15 * 60 : 7 * 60, "training", exWhen || "", null); // 운동
  }
}

// ── ② 구시트 (기상일 3/5~3/17). [타임스탬프날짜, 취침, 입면분, WASO분, 기상, 침대밖, 낮잠, 커피, 술, 질, 컨디션] ──
// 낮잠/커피/술은 "어제" 질문 → 전날(D-1)에 배치.
const OLD_ROWS = [
  ["2026-03-05", "22:00", "0", "0", "5:30", "5:30", null, null, null, null, null],
  ["2026-03-06", "22:30", "10", "90", "7:30", "8:00", null, null, null, "나쁨", "피곤함"],
  ["2026-03-07", "01:00", "0", "0", "05:00", "05:00", null, null, null, "나쁨(일 때문에 줄임)", "피곤함"],
  ["2026-03-08", "22:10", "0", "30", "4:50", "5:00", null, null, "가볍게", "나쁨", "피곤함"],
  ["2026-03-09", "01:30", "0", "20", "7:50", "7:50", null, null, null, "매우나쁨", "피곤함"],
  ["2026-03-10", "23:00", "0", "0", "5:30", "5:30", null, null, null, "좋음", "보통"],
  ["2026-03-11", "22:00", "0", "0", "5:30", "5:30", null, null, "가볍게", "나쁨", "피곤함"],
  ["2026-03-12", "00:30", "0", "0", "6:00", "6:10", null, null, null, "나쁨", "피곤함"],
  ["2026-03-13", "23:00", "0", "0", "6:30", "6:30", null, null, null, "보통", "보통"],
  ["2026-03-14", "02:30", "0", "0", "6:30", "6:30", null, null, null, "나쁨", "피곤함"],
  ["2026-03-15", "01:00", "0", "0", "7:00", "7:10", null, null, "가볍게", "보통", "보통"],
  ["2026-03-16", "23:00", "0", "5", "6:50", "7:00", null, null, null, "보통", "보통"],
  ["2026-03-17", "23:00", "0", "5", "5:30", "6:00", "13:00/30분", null, "가볍게", "보통", "보통"],
];
for (const o of OLD_ROWS) {
  const [date, bedS, solM, wasoM, wakeS, outS, nap, coffee, alcohol, quality, cond] = o;
  const bedDate = kstAdd(date, -1); // 취침일 = 기상아침(date) − 1
  const bed = toMin(bedS), wake = toMin(wakeS), out = toMin(outS);
  if (bed != null && wake != null) {
    const wasoMin = parseInt(wasoM || "0", 10);
    const woke = wasoMin > 0 ? 1 : 0;
    const waso = wasoMin > 0 ? (wasoMin <= 10 ? WASO[0] : wasoMin <= 30 ? WASO[1] : wasoMin <= 60 ? WASO[2] : WASO[3]) : null;
    const outGap = (out != null && wake != null) ? ((out - wake + 1440) % 1440) : null;
    const memo = [quality ? `수면질 ${quality}` : "", cond ? `컨디션 ${cond}` : ""].filter(Boolean).join(" · ");
    sleeps.push({ date: bedDate, data: { bed, wake, sol: solLabel(solM), outbed: outLabel(outGap), woke, waso, feel: [], memo }, summary: `취침 ${hhmm(bed)} · 입면 ${solLabel(solM) || "-"} · 기상 ${hhmm(wake)}${memo ? " · " + memo : ""}` });
  }
  const y = bedDate; // 구폼 "어제" 낮잠/커피/술 → 취침일과 같은 날
  if (nap) { const t = toMin(nap.split("/")[0]); addRoutine(y, t ?? 14 * 60, "nap", "", nap.split("/")[1] || ""); }
  if (coffee) addRoutine(y, 13 * 60, "caffeine", "", null);
  if (alcohol) addRoutine(y, 21 * 60, "alcohol", alcohol, null);
}

// ── 배치 내 중복 제거 (저녁기록 중복 제출 → 같은 날 같은 슬롯 루틴 겹침 방지) ──
{
  const seen = new Set(), uniq = [];
  for (const r of routines) { const k = `${r.date}|${r.data.type}|${r.data.time}`; if (seen.has(k)) continue; seen.add(k); uniq.push(r); }
  routines.length = 0; routines.push(...uniq);
}

// ── 정렬·출력 ──
sleeps.sort((a, b) => a.date.localeCompare(b.date));
routines.sort((a, b) => a.date.localeCompare(b.date) || (a.data.time || "").localeCompare(b.data.time || ""));
const byDate = {};
for (const s of sleeps) (byDate[s.date] ||= { r: [] }).sleep = s;
for (const r of routines) (byDate[r.date] ||= { r: [] }).r.push(r);

console.log(`\n=== 이지수 수면로그 마이그레이션 ${COMMIT ? "(COMMIT)" : "(DRY-RUN)"} ===`);
console.log(`수면 ${sleeps.length}건 · 루틴 ${routines.length}건 · 날짜범위 ${sleeps[0]?.date} ~ ${sleeps[sleeps.length - 1]?.date}\n`);
for (const d of Object.keys(byDate).sort()) {
  const e = byDate[d];
  const s = e.sleep;
  const sl = s ? `수면 취침${hhmm(s.data.bed)}→기상${hhmm(s.data.wake)} 입면[${s.data.sol || "-"}] 깸${s.data.woke}${s.data.waso ? "(" + s.data.waso + ")" : ""}${s.data.memo ? " 📝" + s.data.memo.slice(0, 30) : ""}` : "수면기록 없음";
  console.log(`${d}  ${sl}`);
  for (const r of e.r) console.log(`         └ 루틴 ${r.data.time} ${r.summary}`);
}

if (!COMMIT) { console.log(`\n※ DRY-RUN. 실제 저장하려면 --commit`); process.exit(0); }

// ── COMMIT: 중복 skip 후 insert ──
const sql = neon(process.env.DATABASE_URL);
const existSleep = new Set((await sql`SELECT date::text FROM logs WHERE user_email=${EMAIL} AND kind='sleep'`).map((r) => r.date));
const existRoutine = new Set((await sql`SELECT date::text || '|' || coalesce(data->>'time','') || '|' || coalesce(data->>'type','') AS k FROM logs WHERE user_email=${EMAIL} AND kind='routine'`).map((r) => r.k));
let si = 0, ss = 0, ri = 0, rs = 0;
for (const s of sleeps) {
  if (existSleep.has(s.date)) { ss++; continue; }
  await sql`INSERT INTO logs (user_email, date, kind, summary, data) VALUES (${EMAIL}, ${s.date}, 'sleep', ${s.summary}, ${JSON.stringify(s.data)}::jsonb)`;
  si++;
}
for (const r of routines) {
  const k = `${r.date}|${r.data.time}|${r.data.type}`;
  if (existRoutine.has(k)) { rs++; continue; }
  await sql`INSERT INTO logs (user_email, date, kind, summary, data) VALUES (${EMAIL}, ${r.date}, 'routine', ${r.summary}, ${JSON.stringify(r.data)}::jsonb)`;
  ri++;
}
console.log(`\n✅ 수면 삽입 ${si} · 스킵(중복) ${ss} / 루틴 삽입 ${ri} · 스킵 ${rs}`);
