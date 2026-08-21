// app/reports/page.js — 리포트 탭. 선수의 공개 리포트 아카이브(최신순) + 예정 카드.
// 공개 판정=마스터 `공개 리포트`(없으면 Clerk 폴백). 코치 ?as=<이메일> 미리보기.
import { currentUser } from "@clerk/nextjs/server";
import AppShell, { AppBody } from "../../components/app/AppShell";
import { Surface, ReportRow, SectionHeader } from "../../components/app/primitives";
import { getAthleteByEmail, getAthleteByRef, getExposedAssetSlugs } from "../../lib/master";
import { resolveAssets, publishedReportSet, extrasBySlugs, reportSlug } from "../../lib/athleteAssets";
import { isCoachEmail } from "../../lib/coach";

export const metadata = { title: "리포트 | NOCT" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }) {
  const user = await currentUser();
  const myEmail = user?.emailAddresses?.[0]?.emailAddress;
  const previewRef = isCoachEmail(myEmail) && searchParams?.as ? String(searchParams.as) : null;
  const athlete = previewRef ? await getAthleteByRef(previewRef) : (myEmail ? await getAthleteByEmail(myEmail) : null);
  const lookupEmail = athlete?.email || myEmail;
  const meta = user?.publicMetadata || {};
  const clientName = athlete?.name || user?.unsafeMetadata?.name || user?.firstName || myEmail?.split("@")[0] || "선수";

  const assets = resolveAssets({ name: clientName, email: lookupEmail, reportUrl: meta.reportUrl, guideUrl: meta.guideUrl, dataUrl: meta.dataUrl });
  const pub = athlete ? new Set(athlete.publishedReports || []) : publishedReportSet(meta, assets.reports[0]?.slug || "");
  const openReports = searchParams?.report === "open" ? assets.reports : assets.reports.filter((r) => pub.has(r.slug));
  const newest = [...openReports].reverse();

  // 선수에게 노출된 부가자료(공개 세션에 첨부된 것) 아카이브
  const exposedSlugs = athlete ? await getExposedAssetSlugs(athlete.pageId) : [];
  const exposedExtras = extrasBySlugs(assets.extras, exposedSlugs);

  return (
    <AppShell>
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-1">
        <h1 className="text-[26px] font-bold tracking-[-0.5px] text-foreground">리포트</h1>
        <p className="text-sm text-muted-foreground mt-1.5">{newest.length > 0 ? `총 ${newest.length}건 · 최신순` : "리포트 준비 중"}</p>
      </div>
      <AppBody className="pt-4">
        <Surface>
          {newest.length > 0 ? newest.map((r) => (
            <ReportRow key={r.slug} date={r.date || "리포트"} badge={r.badge} title={r.label} sub={r.desc || "코치가 공개한 리포트예요."} href={`/report/view/${r.slug}`} />
          )) : (
            <div className="p-5 text-[13px] text-muted-foreground">첫 리포트가 준비되면 여기에 열려요.</div>
          )}
        </Surface>

        {exposedExtras.length > 0 ? (
          <>
            <SectionHeader title="자료" className="mt-6" />
            <Surface>
              {exposedExtras.map((e) => (
                <ReportRow key={e.url} date="자료" title={e.label} sub={e.desc || "코치가 공유한 자료예요."} href={`/asset/${reportSlug(e.url)}`} />
              ))}
            </Surface>
          </>
        ) : null}
      </AppBody>
    </AppShell>
  );
}
