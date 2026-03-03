'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // Success - user is logged in. Route to explore page
    router.push('/explore');
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
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
      <div className="fixed top-1/4 left-10 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-10 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Logo - Moved to top left */}
      <header className="absolute top-0 left-0 w-full p-6 md:px-8 z-20">
        <Link href="/" className="flex items-center group w-max">
          <div className="relative h-12 w-48 group-hover:scale-105 transition-transform duration-300">
            <Image
              src="/logo.png"
              alt="CariSkill Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>
      </header>

      {/* Main Content Centered */}
      <main className="flex-grow flex items-center justify-center px-4 py-12 relative z-10 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white w-full max-w-md p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-500 text-sm">Login to continue your learning journey.</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {errorMsg && (
              <div className="p-3 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-300 disabled:text-gray-600 text-gray-900 font-bold py-3 rounded-lg mt-4 transition-colors flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-8">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="px-3 text-xs text-gray-400">or</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          {/* Social Logins */}
          <div className="space-y-3">
            <button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuth('apple')}
              disabled={loading}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
              Continue with Apple
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Don&apos;t have an account? <Link href="/register" className="text-yellow-600 font-semibold hover:underline">Sign up</Link>
          </p>
        </motion.div>
      </main>

      <footer className="text-center py-6 text-sm text-gray-500 border-t border-gray-100 z-10 bg-[#FFFDF6]">
        © 2023 CariSkill Inc. All rights reserved.
      </footer>
    </div>
  );
}