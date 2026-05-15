import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: {
    default: "Tender CRM",
    template: "%s | Tender CRM",
  },
  description: "CRM для участия в государственных закупках Казахстана",
  manifest: "/manifest.json",
  applicationName: "Tender CRM",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tender CRM",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <ToastProvider>
          {children}
          <CommandPalette />
          <ServiceWorkerRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
