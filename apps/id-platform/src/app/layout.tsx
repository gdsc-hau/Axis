import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GDG HAU ID Platform",
  description: "The digital identity and membership verification hub for GDG HAU.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
