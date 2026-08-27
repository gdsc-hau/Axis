"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  Trophy,
  Briefcase,
  Star,
  Medal,
  Award,
  Handshake,
  CreditCard,
} from "lucide-react";

const benefits = [
  { icon: BookOpen, title: "Learning Opportunities", color: "blue" },
  { icon: Users, title: "Networking & Community", color: "green" },
  { icon: Trophy, title: "Competitions & Hackathons", color: "yellow" },
  { icon: Briefcase, title: "Career Development", color: "red" },
  { icon: Star, title: "Exclusive Member Privileges", color: "purple" },
  { icon: Medal, title: "Leadership & Volunteering", color: "orange" },
  { icon: Award, title: "Recognition & Certificates", color: "blue" },
  { icon: Handshake, title: "Partner & Sponsor Perks", color: "green" },
  { icon: CreditCard, title: "Digital ID Benefits", color: "yellow" },
];

const colorStyles: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:border-blue-500/50 group-hover:shadow-[0_0_15px_rgba(66,133,244,0.3)]",
  green:
    "bg-green-500/10 text-green-400 border-green-500/20 group-hover:border-green-500/50 group-hover:shadow-[0_0_15px_rgba(52,168,83,0.3)]",
  yellow:
    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 group-hover:border-yellow-500/50 group-hover:shadow-[0_0_15px_rgba(251,188,5,0.3)]",
  red: "bg-red-500/10 text-red-400 border-red-500/20 group-hover:border-red-500/50 group-hover:shadow-[0_0_15px_rgba(234,67,53,0.3)]",
  purple:
    "bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:border-purple-500/50 group-hover:shadow-[0_0_15px_rgba(155,81,224,0.3)]",
  orange:
    "bg-orange-500/10 text-orange-400 border-orange-500/20 group-hover:border-orange-500/50 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]",
};

export default function FaqBenefits() {
  return (
    <div className="w-full max-w-5xl mx-auto my-16 pt-8 border-t border-white/10 relative">
      <div className="absolute top-0 right-0 -translate-y-1/2 w-16 h-16 sm:w-24 sm:h-24">
        <Image
          src="/assets/images/gyro/surprise_gyro_icon.png"
          alt="Gyro Mascot"
          width={96}
          height={96}
          className="w-full h-full object-contain animate-bounce"
        />
      </div>

      <h3 className="text-2xl md:text-3xl font-bold text-center text-white mb-10 font-mono flex items-center justify-center gap-4">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-green-400 to-yellow-400">
          Benefits of Joining GDG-HAU
        </span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {benefits.map((benefit, i) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-[#030305]/60 border border-white/5 hover:bg-white/5 transition-all duration-300"
            >
              <div
                className={`p-4 rounded-full mb-4 border transition-all duration-300 ${colorStyles[benefit.color]}`}
              >
                <Icon className="w-8 h-8" />
              </div>
              <h4 className="text-white font-semibold text-center">
                {benefit.title}
              </h4>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
