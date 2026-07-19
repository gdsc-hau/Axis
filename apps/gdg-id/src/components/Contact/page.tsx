import Navbar from '@/components/Navbar';

export default function FAQPage() {
    return (
        <main className="min-h-screen bg-[#030305] text-white font-sans relative">
            <Navbar />
            <div className="relative z-10 pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-bold mb-12 font-mono uppercase tracking-tight text-center">
                    Frequently Asked <span className="text-blue-500 italic">Questions</span>
                </h1>

                <div className="space-y-4">
                    {[
                        { q: "How do I update my profile?", a: "Profile data is currently linked to your HAU member registration. Please contact your lead for updates." },
                        { q: "Can I use this ID for physical events?", a: "Yes, this digital ID includes a scanable code valid for all official GDG HAU on-campus events." },
                        { q: "The card animation is laggy on my device.", a: "We recommend using a modern browser like Chrome or Edge. Ensure hardware acceleration is enabled in your settings." }
                    ].map((item, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-blue-400 mb-2 font-mono uppercase">[{i + 1}] {item.q}</h3>
                            <p className="text-gray-400 leading-relaxed">{item.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}