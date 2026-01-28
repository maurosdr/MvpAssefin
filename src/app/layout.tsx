import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BinanceProvider } from "@/context/BinanceContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Crypto Dashboard",
  description: "Live crypto prices, technical analysis, and portfolio tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black min-h-screen`}
      >
        <BinanceProvider>
          {children}
        </BinanceProvider>
      </body>
    </html>
  );
}
