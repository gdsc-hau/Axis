"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck, QrCode, Smartphone, Download } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Membership Verification",
    description:
      "Secure and reliable validation of your active membership status across all GDG-HAU platforms and events.",
  },
  {
    icon: Smartphone,
    title: "Digital ID Generation",
    description:
      "Instantly generate your personalized digital ID card upon membership approval, accessible anytime.",
  },
  {
    icon: QrCode,
    title: "QR Code Integration",
    description:
      "Seamless check-ins and attendance tracking for workshops, hackathons, and exclusive activities.",
  },
  {
    icon: Download,
    title: "Download & Showcase",
    description:
      "Export your ID as a high-quality image or PDF to showcase your affiliation on professional networks.",
  },
];

export default function FaqAbout() {
  return (
    <div className="w-full max-w-5xl mx-auto my-16 pt-8 border-t border-white/10 relative">
      <div className="absolute top-0 left-0 -translate-y-1/2 w-16 h-16 sm:w-24 sm:h-24">
        <Image
          src="/assets/images/gyro/gyro_pose.png"
          alt="Gyro Mascot Pose"
          width={96}
          height={96}
          className="w-full h-full object-contain"
        />
      </div>

      <h3 className="text-2xl md:text-3xl font-bold text-center text-white mb-12 font-mono">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          About the GDG HAU ID Platform
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex gap-5 p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="shrink-0 mt-1">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h4>
                <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
