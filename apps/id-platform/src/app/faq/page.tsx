'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import FaqSearch from '@/components/Faq/FaqSearch';
import FaqAccordion from '@/components/Faq/FaqAccordion';
import FaqBenefits from '@/components/Faq/FaqBenefits';
import FaqAbout from '@/components/Faq/FaqAbout';
import { Info, UserPlus, IdCard, CalendarDays, ShieldCheck, LifeBuoy } from 'lucide-react';

const faqCategories = [
  {
    title: 'General Information',
    icon: <Info className="w-6 h-6 text-blue-400" />,
    items: [
      {
        q: 'What is the GDG-HAU Digital ID Platform?',
        a: 'The GDG-HAU Digital ID Platform is the official member portal for GDG on Campus Holy Angel University. It allows members to register, manage their profile, access their digital membership ID, and stay connected with GDG events and opportunities.',
      },
      {
        q: 'Who can register?',
        a: 'Students, faculty members, alumni, and community members interested in technology and innovation may register, subject to GDG-HAU membership policies.',
      },
      {
        q: 'Is membership free?',
        a: 'Yes. Joining GDG-HAU is free unless otherwise stated for specific activities or programs.',
      },
      {
        q: 'Why should I join GDG-HAU?',
        a: [
          'Workshops and tech talks',
          'Hackathons and competitions',
          'Networking opportunities',
          'Industry insights',
          'Leadership opportunities',
          'Community projects',
          'Exclusive member events',
        ],
      },
    ],
  },
  {
    title: 'Registration & Membership',
    icon: <UserPlus className="w-6 h-6 text-green-400" />,
    items: [
      {
        q: 'How do I become a member?',
        a: 'Create an account on the Digital ID Platform and complete the registration form. Once your information is reviewed and approved, your membership will be activated.',
      },
      {
        q: 'How long does approval take?',
        a: 'Approval times may vary depending on verification volume. Most registrations are processed within a few days.',
      },
      {
        q: 'Can I update my profile information?',
        a: 'Yes. You can edit your profile information through your account dashboard.',
      },
      {
        q: 'What if I entered incorrect information?',
        a: 'You may update eligible fields through your profile settings or contact the GDG-HAU team for assistance.',
      },
    ],
  },
  {
    title: 'Digital ID',
    icon: <IdCard className="w-6 h-6 text-yellow-400" />,
    items: [
      {
        q: 'What is a Digital ID?',
        a: 'A Digital ID is your official GDG-HAU membership identification, accessible through the platform.',
      },
      {
        q: 'How do I access my Digital ID?',
        a: 'After your membership is approved, your Digital ID will become available in your dashboard.',
      },
      {
        q: 'Can I use the Digital ID during events?',
        a: 'Yes. Event organizers may use your Digital ID for attendance verification, member validation, availing discounts, and event check-ins.',
      },
      {
        q: 'Does the Digital ID expire?',
        a: 'Your Digital ID remains active while your membership status remains active.',
      },
      {
        q: 'What should I do if my Digital ID is missing?',
        a: 'Contact the GDG-HAU team through the support channel for assistance.',
      },
    ],
  },
  {
    title: 'Events & Activities',
    icon: <CalendarDays className="w-6 h-6 text-red-400" />,
    items: [
      {
        q: 'How can I join GDG events?',
        a: 'Members can register for upcoming events through official GDG-HAU announcements and registration links.',
      },
      {
        q: 'Do I need to be a member to attend events?',
        a: 'Some events are open to everyone, while others may be exclusive to registered members.',
      },
      {
        q: 'Will I receive certificates?',
        a: 'Eligible events may provide certificates based on attendance requirements and event guidelines.',
      },
      {
        q: 'How can I join hackathons?',
        a: 'Hackathon announcements are posted through official GDG-HAU channels. Details regarding eligibility, registration, and team formation will be provided for each event.',
      },
    ],
  },
  {
    title: 'Verification & Security',
    icon: <ShieldCheck className="w-6 h-6 text-purple-400" />,
    items: [
      {
        q: 'Why do you collect personal information?',
        a: 'Information is collected to verify membership, manage events, generate Digital IDs, and improve community services.',
      },
      {
        q: 'Is my information secure?',
        a: 'GDG-HAU takes reasonable measures to protect member information and limit access to authorized personnel.',
      },
      {
        q: 'Who can see my information?',
        a: 'Only authorized administrators and organizers responsible for community operations and event management.',
      },
    ],
  },
  {
    title: 'Support',
    icon: <LifeBuoy className="w-6 h-6 text-orange-400" />,
    items: [
      {
        q: 'Who should I contact for assistance?',
        a: 'You may contact the GDG-HAU Tech officers through official communication channels or the support section of the platform.',
      },
      {
        q: 'How can I report a bug or issue?',
        a: 'Submit a report through the support form and include screenshots or details to help the team investigate.',
      },
    ],
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return faqCategories;

    const query = searchQuery.toLowerCase();
    
    return faqCategories.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.q.toLowerCase().includes(query) || 
        (Array.isArray(item.a) 
          ? item.a.some(a => a.toLowerCase().includes(query)) 
          : item.a.toLowerCase().includes(query))
      )
    })).filter(category => category.items.length > 0);
  }, [searchQuery]);

  return (
    <main className="min-h-screen bg-[#030305] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden relative">
      <Navbar />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 z-0" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 relative z-10"
          >
            <Image src="/assets/images/gyro/head_openmouth_icon.png" alt="Gyro Mascot" width={160} height={160} className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(66,133,244,0.4)]" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-4 font-mono uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-400"
          >
            Frequently Asked Questions
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8"
          >
            Everything you need to know about the GDG-HAU Digital ID Platform, membership, and events.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSdTlb-2I6oSTFUtcPsJVy5xF4AoWH0bf16BWHtwXP0RYnxCTA/viewform" target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]">
              Become a Member
            </a>
            <a href="#" className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/10">
              Contact Support
            </a>
          </motion.div>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <FaqSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </motion.div>

        {/* Empty State */}
        {filteredCategories.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-32 h-32 mx-auto mb-6 opacity-50">
              <Image src="/assets/images/gyro/dizzy_head_icon.png" alt="No results found" width={128} height={128} className="w-full h-full object-contain" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No results found</h3>
            <p className="text-gray-400">We couldn't find any FAQs matching "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              Clear Search
            </button>
          </motion.div>
        )}

        {/* FAQ Categories */}
        <div className="space-y-12">
          {filteredCategories.map((category, idx) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + (idx * 0.1) }}
            >
              <FaqAccordion 
                category={category.title} 
                icon={category.icon} 
                items={category.items} 
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <FaqBenefits />
          <FaqAbout />
        </motion.div>

      </div>
    </main>
  );
}