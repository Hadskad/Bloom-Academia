import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalkthroughProvider } from "@/components/walkthrough";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Bloom Academia - AI-Powered Education",
  description: "Every child deserves a world-class teacher. Experience personalized, voice-based learning with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        <WalkthroughProvider>
          {children}
        </WalkthroughProvider>
      </body>
    </html>
  );
}
