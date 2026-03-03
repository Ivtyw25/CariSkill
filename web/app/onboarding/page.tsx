'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ChevronDown, BookOpen, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [field, setField] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.updateUser({
      data: {
        field,
        level,
      },
    });

    if (error) {
      console.error("Failed to update user:", error);
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // After success, navigate to explore
    router.push('/explore');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] relative overflow-hidden font-sans text-gray-900">
      {/* Background Pattern and Glows */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#E5E5E5 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      />
      <div className="fixed top-1/3 left-10 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/3 right-10 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Background Icons */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <BookOpen className="absolute top-32 right-32 w-12 h-12 text-yellow-200/50 animate-[float_6s_ease-in-out_infinite] transform rotate-12" />
        <Lightbulb className="absolute bottom-40 left-32 w-10 h-10 text-yellow-200/60 animate-[float_5s_ease-in-out_infinite_1s] transform -rotate-12" />
      </div>

      {/* Header Logo */}
      <header className="absolute top-0 left-0 w-full p-6 z-20">
        <Link href="/" className="flex items-center space-x-2 w-max">
          <div className="w-8 h-8 bg-yellow-400 rounded-md flex items-center justify-center font-bold">C</div>
          <span className="text-xl font-bold">CariSkill</span>
        </Link>
      </header>

      {/* Main Content Centered */}
      <main className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white w-full max-w-[440px] p-8 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* Field Input Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-center mb-4 text-gray-900">What is your field?</h2>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder="e.g. Data Science, Python..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all bg-white text-gray-800 placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Level Dropdown Section */}
            <div className="mb-10">
              <h2 className="text-[17px] font-bold text-center mb-4 text-gray-900">What is your current level?</h2>
              <div className="relative">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all bg-white text-gray-800 appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled className="text-gray-400">Select your level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-300 disabled:text-gray-600 text-gray-900 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Start"
              )}
            </button>
          </form>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500 border-t border-gray-100 z-10 bg-[#FFFDF6]">
        © 2023 CariSkill Inc. All rights reserved.
      </footer>
    </div>
  );
}