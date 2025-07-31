import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ビジネス提案エージェント",
  description: "三菱地所新事業開発部門向けAIビジネス提案生成システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}