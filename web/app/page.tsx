'use client'; // Required for Framer Motion to track scroll events

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BookOpen, Lightbulb, GraduationCap, Brain, FileEdit, Search, Route, Briefcase, TrendingUp, Compass, LineChart, CheckCircle } from 'lucide-react';

export default function Home() {
  // 1. Mouse Tracking State for Parallax
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 2. Spring Physics for smooth movement
  const springConfig = { damping: 50, stiffness: 100, mass: 1 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // 3. Transform mouse position into movement values (Inverse movement for depth)
  const moveX = useTransform(smoothMouseX, [-500, 500], [20, -20]);
  const moveY = useTransform(smoothMouseY, [-500, 500], [20, -20]);
  const moveXSlow = useTransform(smoothMouseX, [-500, 500], [10, -10]);
  const moveYSlow = useTransform(smoothMouseY, [-500, 500], [10, -10]);

  useEffect(() => {
    setIsMounted(true);

    // Check Auth Session
    const checkAuth = async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
      }
    };
    checkAuth();

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate mouse position relative to center of screen
      const x = e.clientX - window.innerWidth / 2;
      const y = e.clientY - window.innerHeight / 2;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Shared animation settings for a smooth fade-in and slide-up effect
  const fadeUpVariant = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
  };

  return (
    <>
      {/* Animated Background Base with Parallax Effect */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-5 dark:opacity-10"
        style={{
          backgroundColor: '#FFFCF0',
          backgroundImage: 'radial-gradient(#E5E5E5 1px, transparent 1px), linear-gradient(to bottom right, #fffdf5 0%, #fff9e6 100%)',
          backgroundSize: '20px 20px, 100% 100%'
        }}
      >
        {isMounted && (
          <>
            <motion.div style={{ x: moveX, y: moveY }} className="absolute inset-0 w-full h-full">
              <BookOpen className="absolute top-20 left-10 w-16 h-16 animate-float-slow text-charcoal dark:text-white" />
              <Brain className="absolute top-1/2 right-10 w-16 h-16 animate-float-medium text-charcoal dark:text-white" style={{ animationDelay: '1.5s' }} />
            </motion.div>

            <motion.div style={{ x: moveXSlow, y: moveYSlow }} className="absolute inset-0 w-full h-full">
              <Lightbulb className="absolute top-40 right-20 w-12 h-12 animate-float-medium text-charcoal dark:text-white" style={{ animationDelay: '1s' }} />
              <GraduationCap className="absolute bottom-32 left-1/4 w-20 h-20 animate-float-slow text-charcoal dark:text-white" style={{ animationDelay: '2s' }} />
              <FileEdit className="absolute bottom-10 right-1/3 w-12 h-12 animate-float-slow text-charcoal dark:text-white" style={{ animationDelay: '0.5s' }} />
            </motion.div>
          </>
        )}
      </div>

      <Navbar isLoggedIn={isLoggedIn} />

      <main className="flex-grow relative z-10">
        <section className="relative pt-20 pb-24 overflow-hidden">

          {/* Breathing Gradient Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 30, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 -mr-20 -mt-20 w-[40rem] h-[40rem] bg-[radial-gradient(circle,var(--tw-gradient-stops))] from-primary/30 to-transparent blur-3xl dark:from-primary/20 pointer-events-none"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
              x: [0, -40, 0],
              y: [0, 20, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[30rem] h-[30rem] bg-[radial-gradient(circle,var(--tw-gradient-stops))] from-yellow-300/40 to-transparent blur-3xl dark:from-yellow-900/20 pointer-events-none"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Animate Hero Section */}
            <motion.div
              className="text-center max-w-5xl mx-auto"
              initial="hidden"
              animate="visible"
              variants={fadeUpVariant}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-yellow-900/30 text-gray-800 dark:text-yellow-300 text-sm font-semibold mb-8 border border-yellow-200 dark:border-yellow-800 shadow-sm relative overflow-hidden group">
                <motion.div
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"
                />
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                New: Universal Topic Roadmaps Live
              </div>

              <h1 className="font-display text-5xl md:text-7xl font-bold text-gray-900 dark:text-white leading-tight mb-8 relative">
                Your AI-Powered Path to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 relative z-10">
                  Self-Mastery
                </span>
                <span className="text-primary block md:inline relative ml-2 drop-shadow-sm z-10">
                  {/* Drawing SVG Underline Animation */}
                  <motion.svg
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.6 }}
                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" as const }}
                    className="absolute w-full h-4 -bottom-1 left-0 text-yellow-300 -z-10"
                    fill="currentColor" viewBox="0 0 200 9" xmlns="http://www.w3.org/2000/svg"
                  >
                    <motion.path
                      d="M2.00024 6.99999C31.5947 3.52258 136.924 -2.85903 198.003 2.00001"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </motion.svg>
                </span>
              </h1>
              <p className="text-xl text-gray-700 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
                Stop guessing your next step. Get tailored roadmaps for any topic, master new skills with AI-generated study tools, and bridge the gap to your dream career.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/explore" className="relative w-full sm:w-auto px-10 py-5 bg-primary text-gray-900 rounded-xl font-bold text-lg hover:bg-primary-dark transition-all transform hover:-translate-y-1 shadow-[0_10px_20px_-5px_rgba(255,215,0,0.5)] border-b-4 border-yellow-600 overflow-hidden group">
                  <motion.div
                    className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
                  />
                  Start Learning Now
                </Link>
                <Link href="/explore" className="w-full sm:w-auto px-8 py-5 bg-white dark:bg-surface-dark text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-lg hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                  <Search className="w-5 h-5" /> Explore Topics
                </Link>
              </div>
            </motion.div>

            {/* Animate the 4 Feature Cards with staggered delays */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: Route, title: "Any Topic Roadmap", desc: "Generate a structured learning path for anything you want to learn." },
                { icon: GraduationCap, title: "Smart Study Suite", desc: "Flashcards and quizzes automatically created from web content." },
                { icon: Briefcase, title: "Career Fit Analysis", desc: "Match your skills to job descriptions to find gaps." },
                { icon: TrendingUp, title: "Progress Tracking", desc: "Visualize your learning journey and stay motivated." }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: index * 0.15 } }
                    }}
                    className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none border-t-4 border-primary flex flex-col items-center text-center gap-3 hover:transform hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center text-2xl mb-2 shadow-inner">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Animate Section Header */}
            <motion.div
              className="text-center mb-20"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUpVariant}
            >
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">Your AI Learning Powerhouse</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">CariSkill equips you with three core engines to accelerate your personal growth and professional readiness.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Core Engine 1 */}
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
                variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.1 } } }}
                className="group relative rounded-[2rem] overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-xl shadow-gray-200/60 dark:shadow-none hover:shadow-2xl hover:shadow-yellow-500/10 border-t-8 border-primary transition-all duration-500 hover:-translate-y-2"
              >
                <div className="p-8 md:p-10 relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-white border border-yellow-200 rounded-2xl flex items-center justify-center mb-8 shadow-sm transform group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3">
                    <Compass className="text-yellow-600 w-8 h-8 font-bold" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Personalized Learning Roadmaps</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed flex-grow">
                    Whether it&apos;s &quot;Python Programming&quot; or &quot;Italian Cooking&quot;, enter any goal and receive a structured, week-by-week curriculum tailored just for you.
                  </p>
                  <ul className="space-y-4 mb-8 bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800/50">
                    <li className="flex items-start text-gray-700 dark:text-gray-300 text-sm">
                      <CheckCircle className="text-primary mr-3 w-5 h-5 mt-0.5" />
                      <span>Generates paths for <span className="font-semibold text-gray-900 dark:text-white">any topic</span> or skill</span>
                    </li>
                    <li className="flex items-start text-gray-700 dark:text-gray-300 text-sm">
                      <CheckCircle className="text-primary mr-3 w-5 h-5 mt-0.5" />
                      <span>Curates top-rated free resources</span>
                    </li>
                  </ul>
                  <div className="relative h-48 bg-yellow-50/50 dark:bg-black rounded-xl p-5 overflow-hidden border border-yellow-100 dark:border-gray-800 group-hover:border-primary/30 transition-colors">
                    <div className="flex flex-col gap-4 relative">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-14 bg-primary rounded-full shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
                        <div className="flex-1 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                          <div className="h-2 w-20 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                          <div className="h-2 w-32 bg-gray-100 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 opacity-70">
                        <div className="w-3 h-14 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        <div className="flex-1 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-transparent border-dashed border-gray-300 dark:border-gray-600">
                          <div className="h-2 w-16 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                          <div className="h-2 w-24 bg-gray-100 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Core Engine 2 */}
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
                variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } } }}
                className="group relative rounded-[2rem] overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-xl shadow-gray-200/60 dark:shadow-none hover:shadow-2xl hover:shadow-yellow-500/10 border-t-8 border-primary transition-all duration-500 hover:-translate-y-2"
              >
                <div className="p-8 md:p-10 relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-white border border-yellow-200 rounded-2xl flex items-center justify-center mb-8 shadow-sm transform group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3">
                    <LineChart className="text-yellow-600 w-8 h-8 font-bold" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Skill Gap Analysis</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed flex-grow">
                    Upload your resume and a target job description. Our AI analyzes the overlap, highlights missing skills, and suggests specific learning modules.
                  </p>
                  <ul className="space-y-4 mb-8 bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800/50">
                    <li className="flex items-start text-gray-700 dark:text-gray-300 text-sm">
                      <CheckCircle className="text-primary mr-3 w-5 h-5 mt-0.5" />
                      <span>Instant Resume vs Job Ad comparison</span>
                    </li>
                    <li className="flex items-start text-gray-700 dark:text-gray-300 text-sm">
                      <CheckCircle className="text-primary mr-3 w-5 h-5 mt-0.5" />
                      <span>Actionable skill improvement tips</span>
                    </li>
                  </ul>
                  <div className="relative h-48 bg-yellow-50/50 dark:bg-black rounded-xl p-5 overflow-hidden border border-yellow-100 dark:border-gray-800 group-hover:border-primary/30 transition-colors flex items-center justify-center">
                    <div className="text-center w-full">
                      <div className="flex justify-between items-center mb-2 px-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Match</span>
                        <span className="text-xs font-bold text-yellow-600">Strong</span>
                      </div>
                      <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "87%" }}
                          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" as const }}
                          className="absolute top-0 left-0 h-full bg-primary rounded-full shadow-[0_0_15px_rgba(255,215,0,0.6)]"
                        ></motion.div>
                      </div>
                      <div className="flex justify-around text-center">
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">87%</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">3</span>
                          <span className="text-[10px] text-gray-500 uppercase">Gaps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Core Engine 3 */}
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
                variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.5 } } }}
                className="group relative rounded-[2rem] overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-xl shadow-gray-200/60 dark:shadow-none hover:shadow-2xl hover:shadow-yellow-500/10 border-t-8 border-primary transition-all duration-500 hover:-translate-y-2"
              >
                <div className="p-8 md:p-10 relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-white border border-yellow-200 rounded-2xl flex items-center justify-center mb-8 shadow-sm transform group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3">
                    <BookOpen className="text-yellow-600 w-8 h-8 font-bold" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI-Powered Study Suite</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed flex-grow">
                    Turn any article or web page into a study session. Our AI instantly generates flashcards, summaries, and quizzes to reinforce your learning.
                  </p>
                  <ul className="space-y-4 mb-8 bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800/50">
                    <li className="flex items-start text-gray-700 dark:text-gray-300 text-sm">
                      <CheckCircle className="text-primary mr-3 w-5 h-5 mt-0.5" />
                      <span>Automated <span className="font-semibold text-gray-900 dark:text-white">Flashcards &amp; Quizzes</span></span>
                    </li>
                    <li className="flex items-start text-gray-700 dark:text-gray-300 text-sm">
                      <CheckCircle className="text-primary mr-3 w-5 h-5 mt-0.5" />
                      <span>Works on any web content</span>
                    </li>
                  </ul>
                  <div className="relative h-48 bg-yellow-50/50 dark:bg-black rounded-xl p-5 overflow-hidden border border-yellow-100 dark:border-gray-800 group-hover:border-primary/30 transition-colors flex items-center justify-center [perspective:1000px]">
                    <div className="relative w-36 h-28">
                      <div className="absolute inset-0 bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center transform rotate-6 transition-all duration-500 group-hover:rotate-12 origin-bottom-right z-0"></div>
                      <div className="absolute inset-0 bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center transform -rotate-3 transition-all duration-500 group-hover:-rotate-6 origin-bottom-left z-10"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-yellow-400 shadow-xl rounded-lg border border-yellow-500 flex flex-col items-center justify-center transform transition-all duration-500 group-hover:scale-105 z-20">
                        <span className="text-gray-900 font-bold text-lg mb-1">Quiz #1</span>
                        <span className="text-gray-900/70 text-xs">Tap to Flip</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Animate Final CTA Footer */}
        <section className="py-24 relative overflow-hidden bg-charcoal dark:bg-black">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <motion.div
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } }
            }}
          >
            <h2 className="font-display text-4xl font-bold text-white mb-6">Ready to Master Your Future?</h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">Join thousands of self-learners who have accelerated their growth with CariSkill&apos;s AI platform.</p>
            <Link href="/explore" className="inline-block px-12 py-5 bg-primary text-gray-900 rounded-full font-bold text-lg hover:bg-white hover:text-charcoal hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.6)] transform hover:-translate-y-1">
              Get Started for Free
            </Link>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  );
}