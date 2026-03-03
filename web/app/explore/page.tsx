'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { exploreData, BubbleSize } from '@/lib/explore-data';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Upload, Plus, Sparkles, TrendingUp, Users, Loader2
} from 'lucide-react';
import Link from 'next/link';

import { useRouter } from 'next/navigation';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 200, damping: 20 } }
};

const FloatingBubble = ({ text, size, top, left, delay, onClick }: any) => {
  const styleVariants: any = {
    // Exact sizes: w-24 = 96px, w-32 = 128px, w-40 = 160px
    sm: 'w-24 h-24 text-xs p-3 ring-4 ring-[#FEF9C3] shadow-md shadow-[#FFD700]/20',
    md: 'w-32 h-32 text-sm p-4 ring-6 ring-[#FEF9C3] shadow-lg shadow-[#FFD700]/30',
    lg: 'w-40 h-40 text-base p-5 ring-8 ring-[#FEF9C3] shadow-xl shadow-[#FFD700]/40'
  };

  return (
    <motion.div
      onClick={onClick}
      className={`absolute rounded-full flex items-center justify-center bg-white font-bold text-gray-800 border border-yellow-100 cursor-pointer hover:scale-105 hover:shadow-2xl hover:ring-[#FFD700]/40 transition-all duration-300 z-20 text-center leading-tight break-words overflow-hidden
        ${styleVariants[size]}
      `}
      style={{ top, left, transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -15, 0],
        x: [0, Math.random() * 10 - 5, 0]
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
        y: { duration: 4 + Math.random() * 2, repeat: Infinity, ease: "easeInOut", delay },
        x: { duration: 4 + Math.random() * 2, repeat: Infinity, ease: "easeInOut", delay }
      }}
    >
      <span className="line-clamp-3">{text}</span>
    </motion.div>
  );
};

export default function ExplorePage() {
  const router = useRouter();
  const [bubbles, setBubbles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. We need a reference to the container to know its exact pixel size
  const containerRef = useRef<HTMLDivElement>(null);

  // 2. The Collision Detection Algorithm
  // 2. The Collision Detection Algorithm (UPDATED)
  const calculatePositions = (rawBubbles: any[], containerW: number, containerH: number) => {
    const placedBubbles: any[] = [];
    const minGap = 20; // Minimum space between bubbles
    const edgeBuffer = 40; // Force bubbles to stay 40px away from the dashed walls

    rawBubbles.forEach((bubble) => {
      // Estimate the radius based on our Tailwind CSS classes
      let radius = 48; // sm default (w-24 = 96px / 2)
      if (bubble.size === 'md') radius = 64; // w-32 = 128px / 2
      if (bubble.size === 'lg') radius = 80; // w-40 = 160px / 2

      let isPlaced = false;
      let attempts = 0;
      let x = 0, y = 0;

      // Calculate the safe internal area where centers can be placed
      const safeW = Math.max(0, containerW - (radius * 2) - (edgeBuffer * 2));
      const safeH = Math.max(0, containerH - (radius * 2) - (edgeBuffer * 2));

      // Try up to 200 times to find a random spot that doesn't overlap
      while (!isPlaced && attempts < 200) {
        // Generate coordinates strictly inside the safe zone
        x = radius + edgeBuffer + Math.random() * safeW;
        y = radius + edgeBuffer + Math.random() * safeH;

        // Check distance against all previously placed bubbles
        const hasCollision = placedBubbles.some((placed) => {
          const dx = x - placed.x;
          const dy = y - placed.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < (radius + placed.radius + minGap);
        });

        if (!hasCollision) {
          isPlaced = true;
        }
        attempts++;
      }

      placedBubbles.push({
        ...bubble,
        x,
        y,
        radius,
        top: `${y}px`,
        left: `${x}px`,
      });
    });

    return placedBubbles;
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const payload = {
          field: "Software Engineering & Full-Stack Development",
          level: "University Student / Intermediate",
          currentSkills: ["Angular", "Firebase", "React.js", "Node.js", "Oracle APEX", "SQL"]
        };

        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("API Failed");

        const dynamicBubbles = await response.json();

        // 3. Once we get the bubbles, run the positioning algorithm based on screen size
        if (containerRef.current) {
          const containerW = containerRef.current.clientWidth;
          const containerH = containerRef.current.clientHeight;
          const positionedBubbles = calculatePositions(dynamicBubbles, containerW, containerH);
          setBubbles(positionedBubbles);
        } else {
          setBubbles(dynamicBubbles); // Fallback
        }

      } catch (error) {
        console.error("Error loading bubbles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900 overflow-hidden">
      <Navbar isLoggedIn={true} />

      <style dangerouslySetInnerHTML={{
        __html: `
        .horizontal-scroll::-webkit-scrollbar { height: 8px; }
        .horizontal-scroll::-webkit-scrollbar-track { background: transparent; }
        .horizontal-scroll::-webkit-scrollbar-thumb { background-color: #E5E7EB; border-radius: 10px; }
        .horizontal-scroll::-webkit-scrollbar-thumb:hover { background-color: #D1D5DB; }
      `}} />

      <main className="flex-grow relative flex flex-col items-center py-12 px-4 h-full w-full">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-7xl mx-auto z-10">

          <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-24 relative">
            <button
              onClick={() => router.push('/analyse')}
              className="w-full bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-lg shadow-[#FFD700]/20 transition-all active:scale-95 group border-2 border-[#FFD700]"
            >
              <div className="text-left">
                <h3 className="font-display font-bold text-xl md:text-2xl mb-1 group-hover:translate-x-1 transition-transform">
                  {exploreData.hero.analyseTitle}
                </h3>
                <p className="text-sm font-medium text-gray-800">
                  {exploreData.hero.analyseDesc}
                </p>
              </div>
              <div className="bg-white/90 p-3 md:p-4 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm">
                <Upload className="w-6 h-6 md:w-8 md:h-8 text-[#A16207] stroke-[2.5]" />
              </div>
            </button>

            <Link
              href="/setup"
              className="w-full bg-[#FFFBEB] hover:bg-[#FEF3C7] text-gray-900 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-lg shadow-[#FEF3C7]/40 transition-all active:scale-95 group border-2 border-[#FDE68A]"
            >
              <div className="text-left">
                <h3 className="font-display font-bold text-xl md:text-2xl mb-1 group-hover:translate-x-1 transition-transform">
                  {exploreData.hero.newSkillTitle}
                </h3>
                <p className="text-sm font-medium text-gray-700">
                  {exploreData.hero.newSkillDesc}
                </p>
              </div>
              <div className="bg-white p-3 md:p-4 rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-sm border border-[#FDE68A]">
                <Plus className="w-6 h-6 md:w-8 md:h-8 text-[#D97706] stroke-[2.5]" />
              </div>
            </Link>
          </div>

          <div className="mb-32 flex flex-col items-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 mb-12">
              <Sparkles className="w-6 h-6 text-[#CA8A04] animate-pulse" />
              Recommended for your stack
            </h2>

            {/* 4. ATTACH THE REF TO THE CONTAINER */}
            <div
              ref={containerRef}
              className="relative w-full max-w-4xl h-[450px] md:h-[500px] flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin text-[#FFD700]" />
                  <p className="font-medium animate-pulse">AI is mapping your next skills...</p>
                </div>
              ) : (
                <AnimatePresence>
                  {bubbles.map((bubble) => (
                    <FloatingBubble
                      key={bubble.id || bubble.text}
                      text={bubble.text}
                      size={bubble.size}
                      top={bubble.top}    // Now passed as "240px" instead of "40%"
                      left={bubble.left}  // Now passed as "120px" instead of "20%"
                      delay={Math.random()} // Randomize the float animation slightly
                      onClick={() => router.push(`/setup?topic=${encodeURIComponent(bubble.text)}`)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          <div className="mb-12 w-full">
            {/* ... Keep your existing Trending section here ... */}
            <div className="flex items-center mb-8">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-[#CA8A04]" />
                {exploreData.popularTitle}
              </h2>
            </div>

            <div className="w-full overflow-x-auto pb-8 pt-4 -mt-4 horizontal-scroll">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-100px" }}
                className="flex gap-6 w-max px-2"
              >
                {exploreData.popularSkills.map((skill) => (
                  <motion.div
                    key={skill.id}
                    variants={cardVariants}
                    onClick={() => router.push(`/setup?topic=${encodeURIComponent(skill.title)}`)}
                    className="w-[280px] shrink-0 bg-white rounded-[24px] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 border border-gray-100 flex flex-col h-full cursor-pointer transition-all duration-300 group"
                  >
                    <div className="bg-[#FEF9C3] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <skill.icon className="w-6 h-6 text-[#A16207]" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{skill.title}</h3>
                    <p className="text-sm text-gray-500 mb-6 flex-grow leading-relaxed">
                      {skill.desc}
                    </p>
                    <div className="mt-auto">
                      <span className="inline-flex items-center gap-1.5 bg-[#FFFBEB] text-[#B45309] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#FEF3C7]">
                        <Users className="w-3.5 h-3.5" />
                        {skill.learners} Learners
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div >
  );
}