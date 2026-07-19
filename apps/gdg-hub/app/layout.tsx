import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@hau/axis-ui/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GDG Hub — Axis",
  description:
    "The community hub for GDG HAU — events, leaderboards, certificates, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
