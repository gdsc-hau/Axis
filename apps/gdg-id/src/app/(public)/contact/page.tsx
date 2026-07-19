import type { Metadata } from "next";
import Contact from "@/components/Contact/Contact";

export const metadata: Metadata = {
  title: "Contact – GDG-HAU Digital ID Platform",
  description:
    "Get in touch with the GDG-HAU team. Reach out via email, Facebook, Instagram, or LinkedIn for support, partnerships, or inquiries.",
  openGraph: {
    title: "Contact – GDG-HAU Digital ID Platform",
    description:
      "Get in touch with the GDG-HAU team for support, partnerships, or inquiries.",
  },
};

export default function ContactPage() {
  return <Contact />;
}
