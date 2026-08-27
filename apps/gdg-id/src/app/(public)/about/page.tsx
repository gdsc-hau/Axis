import type { Metadata } from "next";
import About from "@/components/About/About";

export const metadata: Metadata = {
  title: "About – GDG-HAU Digital ID Platform",
  description:
    "Learn about the GDG-HAU Digital ID Platform: a centralized digital identity system for GDG on Campus Holy Angel University members.",
  openGraph: {
    title: "About – GDG-HAU Digital ID Platform",
    description:
      "A centralized digital identity system for GDG on Campus Holy Angel University members.",
  },
};

export default function AboutPage() {
  return <About />;
}
