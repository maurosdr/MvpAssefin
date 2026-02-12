import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BinanceProvider } from "@/context/BinanceContext";
import { StopLossProvider } from "@/context/StopLossContext";

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
  title: "Assefin - Global Markets & News",
  description: "Global news, prediction markets, crypto prices, and portfolio tracking",
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
          <StopLossProvider>
            {children}
          </StopLossProvider>
        </BinanceProvider>
      </body>
    </html>
  );
}
