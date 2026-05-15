import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPalette } from "@/components/command-palette/CommandPalette";

export const metadata: Metadata = {
  title: {
    default: "Tender CRM",
    template: "%s | Tender CRM",
  },
  description: "CRM для участия в государственных закупках Казахстана",
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
        </ToastProvider>
      </body>
    </html>
  );
}
