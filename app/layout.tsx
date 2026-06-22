import type { Metadata } from "next";
import "./globals.css";
import { CmsToastProvider } from "@/components/cms-toast-provider";

export const metadata: Metadata = {
  title: "SportsAI CMS",
  description: "SportsAI content management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CmsToastProvider>{children}</CmsToastProvider>
      </body>
    </html>
  );
}
