import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { ASPECT_RATIO } from "@/config/format";
import { APP_NAME } from "@/config/app";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "video brevi con testo sincronizzato sulla tua canzone",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" style={{ "--ar": String(ASPECT_RATIO) } as CSSProperties}>
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
