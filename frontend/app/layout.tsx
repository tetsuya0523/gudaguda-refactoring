import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ぐだぐだリファクタリング",
  description: "ぐだぐだを、やる気に変えよう",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
