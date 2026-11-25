import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ToastProvider } from "@/components/ui/toast-provider";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Cashly ERP",
  description: "نظام ERP متكامل لإدارة الأعمال",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased">
        <Script
          id="theme-preload"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const theme = localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
                const root = document.documentElement;
                root.dataset.theme = theme;
                root.classList.toggle('light', theme === 'light');
                root.classList.toggle('dark', theme === 'dark');
              } catch (_) {}
            })();`,
          }}
        />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
