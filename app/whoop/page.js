// app/whoop/page.js — 선수 WHOOP 페이지 (내정보 > 기기 연동 · 홈 WHOOP 카드에서 진입).
// 미연결: 안내 + 연결 버튼 / 연결됨: 지난밤 요약 + 최근 2주 차트 + 해제 / 재연결 필요: 재연결 안내.
import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell, { AppBody } from "../../components/app/AppShell";
import { Surface, SectionHeader, StatusBadge } from "../../components/app/primitives";
import WhoopSummary from "../../components/whoop/WhoopSummary";
import WhoopCharts from "../../components/whoop/WhoopCharts";
import WhoopDisconnect from "../../components/whoop/WhoopDisconnect";
import WhoopStatusIcon from "../../components/whoop/WhoopStatusIcon";
import ClearWhoopNotice from "../../components/whoop/ClearWhoopNotice";
import WhoopConnectButton from "../../components/whoop/WhoopConnectButton";
import { getWhoopStatus, getWhoopDays, SHOW_WHOOP_DATA_TO_ATHLETES } from "../../lib/whoop/read";

export const metadata = { title: "WHOOP | NOCT" };
export const dynamic = "force-dynamic";

// /api/whoop/callback 이 붙여주는 ?whoop= 결과 안내
const NOTICE = {
  connected: "WHOOP이 연결됐어요. 지난 30일 기록을 가져왔어요.",
  denied: "WHOOP 연결을 취소했어요.",
  invalid_state: "연결 확인에 실패했어요. 다시 시도해주세요.",
  login_required: "로그인 후 다시 시도해주세요.",
  consent_required: "WHOOP을 연결하려면 기록 저장 동의가 필요해요.",
  error: "연결 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.",
  already_linked: (hint) =>
    `이 WHOOP 계정은 이미 다른 계정${hint ? `(${hint})` : ""}에 연결돼 있어요. 그 계정에서 해제한 뒤 다시 연결해 주세요.`,
};

export default async function WhoopPage({ searchParams }) {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "";
  const { status } = await getWhoopStatus(email);
  const linked = status === "active" || status === "needs_reauth";
  const days = linked && SHOW_WHOOP_DATA_TO_ATHLETES ? await getWhoopDays(email, 14) : [];
  // 결과: 주소(?whoop=) 우선, 없으면 callback이 남긴 2분짜리 쿠키(주소 끝이 떨어졌을 때 예비). 보여준 뒤 쿠키는 지움.
  const noticeCookie = cookies().get("whoop_notice")?.value;
  const fromCookie = noticeCookie ? Object.fromEntries(new URLSearchParams(noticeCookie)) : {};
  const result = searchParams?.whoop ? searchParams : fromCookie;
  const rawNotice = NOTICE[result.whoop];
  // hint는 주소창에서 바꿀 수 있으니 가린 이메일 형태(a***@도메인)일 때만 표시
  const hint = /^.\*\*\*@[\w.-]+$/.test(result.hint || "") ? result.hint : "";
  const notice = typeof rawNotice === "function" ? rawNotice(hint) : rawNotice;

  return (
    <AppShell>
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-2">
        <Link href="/me" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground mb-3">
          <ChevronLeft className="w-4 h-4" />내 정보
        </Link>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground">WHOOP</h1>
          {status === "active" ? <StatusBadge dot>연결됨</StatusBadge> : status === "needs_reauth" ? <StatusBadge tone="plain">재연결 필요</StatusBadge> : null}
        </div>
      </div>

      <AppBody className="pt-2">
        {noticeCookie ? <ClearWhoopNotice /> : null}
        {notice ? <div className="mt-2 text-[13px] font-semibold text-primary bg-primary/10 rounded-xl px-4 py-3">{notice}</div> : null}

        {!linked ? (
          <>
            <Surface className="mt-4">
              <div className="p-4">
                <div className="text-base font-semibold text-foreground">WHOOP 데이터를 코칭에 연결해요</div>
                <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                  한 번 연결하면 수면·회복(HRV, 안정시 심박) 기록이 매일 자동으로 들어와요.
                  따로 입력할 필요 없이 코치와 함께 볼 수 있어요.
                </p>
              </div>
              <WhoopConnectButton title="WHOOP 연결하기" />
            </Surface>
            <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">
              연결 버튼을 누르면 WHOOP 로그인 화면으로 이동해요. 언제든 이 화면에서 연결을 해제할 수 있어요.
              {" "}<Link href="/privacy" className="underline underline-offset-2">개인정보처리방침</Link>
            </p>
          </>
        ) : (
          <>
            {status === "needs_reauth" ? (
              <Surface className="mt-4">
                <WhoopConnectButton reconnect title="WHOOP 다시 연결하기" desc="연결이 만료돼 새 기록이 들어오지 않고 있어요." />
              </Surface>
            ) : null}

            {SHOW_WHOOP_DATA_TO_ATHLETES ? (
              <>
                <SectionHeader title="지난밤" className="mt-6" />
                <Surface>
                  <WhoopSummary latest={days[days.length - 1]} />
                </Surface>

                <SectionHeader title="최근 2주" />
                <WhoopCharts days={days} />
              </>
            ) : (
              <Surface className="mt-4">
                <div className="p-4 flex items-start gap-3">
                  <span className="mt-0.5"><WhoopStatusIcon status={status} size={22} /></span>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-foreground">WHOOP 기록이 코칭에 연결돼 있어요</div>
                    <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                      수면·회복 기록은 매일 자동으로 들어오고, 코치가 확인해요.
                    </p>
                  </div>
                </div>
              </Surface>
            )}

            <SectionHeader title="연결 관리" />
            <Surface>
              <WhoopDisconnect />
            </Surface>
          </>
        )}
      </AppBody>
    </AppShell>
  );
}
