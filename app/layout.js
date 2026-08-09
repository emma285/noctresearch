import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const viewport = {
  themeColor: "#0D1B2A",
};

export const metadata = {
  title: "운동선수 수면코칭 | 녹트리서치",
  description: "수면 진단부터 컨디션 관리까지, 선수 맞춤 1:1 수면 코칭 프로그램.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NOCT Sleep", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "운동선수 수면코칭 | 녹트리서치",
    description: "수면 진단부터 컨디션 관리까지, 선수 맞춤 1:1 수면 코칭 프로그램.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "운동선수 수면코칭 | 녹트리서치",
    description: "수면 진단부터 컨디션 관리까지, 선수 맞춤 1:1 수면 코칭 프로그램.",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="ko">
        <body className="bg-slate-950 antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
