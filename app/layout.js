import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "수면 코칭 사전 질문지 | Noct Research",
  description: "맞춤 수면 코칭을 위한 사전 질문지입니다.",
  icons: { icon: "/favicon.ico" },
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
