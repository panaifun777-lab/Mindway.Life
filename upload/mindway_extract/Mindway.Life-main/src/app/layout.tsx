import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "哲学为人生烦恼找答案 - 120位思想者为你解忧",
  description: "120位跨越时空的东西方哲学家，为你的人生困境点亮一盏灯。AI驱动的哲学对话平台，让孔子、尼采、萨特等思想者为你解答人生困惑。",
  keywords: ["哲学", "人生烦恼", "AI对话", "思想家", "尼采", "加缪", "萨特", "存在主义"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "哲学为人生烦恼找答案",
    description: "120位跨越时空的东西方思想者，为你的人生困境点亮一盏灯",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
