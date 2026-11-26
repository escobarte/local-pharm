import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppRuntime } from "@/components/pwa/AppRuntime";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Local Pharm",
  description: "Домашняя аптечка: что есть, где лежит и когда истекает срок.",
  applicationName: "Local Pharm",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Local Pharm",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#122056",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="antialiased">
        {children}
        <AppRuntime />
      </body>
    </html>
  );
}
