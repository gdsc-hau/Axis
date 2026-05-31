import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import "./globals.css";
import ChatbotWidget from "../components/Chatbot/ChatbotWidget";

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "GDG HAU ID Platform",
  description: "The digital identity and membership verification hub for GDG HAU.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={vt323.className}>
        {children}
        <ChatbotWidget />
      </body>
    </html>
  );
}

