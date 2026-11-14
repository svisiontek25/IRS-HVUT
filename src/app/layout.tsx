import type { Metadata } from "next";
import "./globals.css";
import { PocProvider } from "@/components/PocProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "IRS-HVUT (2290 tax filings) — IRS Form 2290 E-File Simulator",
  description:
    "IRS-HVUT Form 2290 Heavy Highway Vehicle Use Tax e-filing portal with local MeF gateway, watermarked Schedule 1 PDF, payment, and notification simulation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PocProvider>
          <AppShell>{children}</AppShell>
        </PocProvider>
      </body>
    </html>
  );
}
