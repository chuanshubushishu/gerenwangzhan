import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IFC Model Viewer",
  description: "Public local viewer for uploaded IFC building models.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
