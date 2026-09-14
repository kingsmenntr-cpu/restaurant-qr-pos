import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Agra Foods - QR POS",
  description: "Restaurant Real-Time QR POS - Glassmorphism",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-[30%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-violet-700/30 to-indigo-800/20 blur-[120px]" />
          <div className="absolute -bottom-[20%] -right-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-fuchsia-600/20 to-blue-700/20 blur-[120px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
