'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Network, PlusCircle } from 'lucide-react';
import FlowGraph from '@/components/FlowGraph';

export default function ProgressPage() {


  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative overflow-hidden flex flex-col items-center py-12 z-10">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-40 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="text-center z-10 mb-8 mt-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3"
          >
            Skill Mastery
          </motion.h1>
        </div>

        <div className="relative w-full max-w-6xl mx-auto px-4 z-10">

          <div className="w-full mt-2 animate-in fade-in zoom-in duration-500">
            <FlowGraph />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 z-10 pb-10"
        >
          <button className="flex items-center gap-2 px-8 py-4 bg-primary text-gray-900 rounded-full font-bold text-lg hover:bg-yellow-400 transition-all shadow-[0_4px_20px_rgba(255,215,0,0.4)] hover:shadow-[0_8px_25px_rgba(255,215,0,0.6)] transform hover:-translate-y-1 ring-4 ring-yellow-100 active:scale-95">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
            Expand My Tree
          </button>
        </motion.div>

      </main>

      <Footer />
    </div>
  );
}