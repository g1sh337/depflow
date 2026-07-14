import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import { TabBar } from "@/components/TabBar";
import { AuthGate } from "@/components/AuthGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "DepFlow",
  description: "Учёт депозитов и выводов — Telegram Mini App",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen">
        <Providers>
          <AuthGate>
            <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col pb-24">
              {children}
            </div>
            <TabBar />
          </AuthGate>
        </Providers>
      </body>
    </html>
  );
}
