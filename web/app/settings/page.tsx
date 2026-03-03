'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { User, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    timezone: 'Eastern Time (US & Canada)',
    language: 'English'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFormData(prev => ({
          ...prev,
          name: user.user_metadata?.full_name || '',
          email: user.email || ''
        }));
      }
      setLoadingInitial(false);
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        email: formData.email,
        data: {
          full_name: formData.name
        }
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      // Refresh router so components (like Sidebar if active) might pick up new info
      router.refresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
      // clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex flex-col py-12 px-4 sm:px-6 lg:px-8">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="max-w-4xl mx-auto w-full z-10">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
            <p className="text-gray-600">Manage your profile information and connected services.</p>
          </div>

          {/* Personal Information Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <User className="w-5 h-5 text-gray-500" />
              <h2 className="font-display text-lg font-bold text-gray-800">Personal Information</h2>
            </div>

            <div className="p-6">
              {message.text && (
                <div className={`mb-6 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'} border`}>
                  {message.text}
                </div>
              )}

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 ${loadingInitial ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border-gray-300 bg-gray-50 focus:border-[#FFD700] focus:ring-[#FFD700] px-4 py-2 border outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border-gray-300 bg-gray-50 focus:border-[#FFD700] focus:ring-[#FFD700] px-4 py-2 border outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full rounded-lg border-gray-300 bg-gray-50 focus:border-[#FFD700] focus:ring-[#FFD700] px-4 py-2 border outline-none transition-all appearance-none"
                  >
                    <option>Eastern Time (US & Canada)</option>
                    <option>Pacific Time (US & Canada)</option>
                    <option>Central European Time</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="language">Language</label>
                  <select
                    id="language"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full rounded-lg border-gray-300 bg-gray-50 focus:border-[#FFD700] focus:ring-[#FFD700] px-4 py-2 border outline-none transition-all appearance-none"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || loadingInitial}
                className="bg-[#FFD700] hover:bg-[#E6C200] disabled:bg-[#FFD700]/50 text-gray-900 font-bold py-2.5 px-6 rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 min-w-[160px]"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>

          {/* Linked Accounts Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <LinkIcon className="w-5 h-5 text-gray-500" />
              <h2 className="font-display text-lg font-bold text-gray-800">Linked Accounts</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Facebook */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-[150px]">
                  <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-gray-800">Facebook</span>
                </div>
                <input type="text" disabled value="Not connected" className="flex-grow w-full md:w-auto rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm py-2 px-3 outline-none" />
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <button className="flex-1 md:flex-none bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-1.5 px-4 rounded-lg text-sm transition-colors shadow-sm min-w-[70px]">Link</button>
                  <button className="flex-1 md:flex-none bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold py-1.5 px-4 rounded-lg text-sm transition-colors shadow-sm min-w-[70px]">Unlink</button>
                </div>
              </div>

              {/* Apple */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-[150px]">
                  <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" opacity="0" />
                    <path d="M16.365 14.363c-.005-2.71 2.213-4.004 2.314-4.06-1.252-1.83-3.213-2.078-3.911-2.112-1.673-.169-3.268.986-4.12.986-.848 0-2.158-1.025-3.535-1.002-1.782.023-3.424 1.037-4.342 2.637-1.854 3.213-.474 7.971 1.332 10.584.887 1.282 1.933 2.717 3.308 2.666 1.332-.05 1.838-.858 3.398-.858 1.558 0 2.021.858 3.418.832 1.42-.023 2.333-1.299 3.216-2.585 1.025-1.498 1.448-2.951 1.468-3.028-.031-.013-2.842-1.09-2.846-4.06zM14.516 6.559c.741-.896 1.24-2.143 1.104-3.39-1.077.043-2.38.716-3.138 1.611-.605.717-1.192 1.986-1.033 3.208 1.201.093 2.327-.534 3.067-1.429z" />
                  </svg>
                  <span className="font-semibold text-gray-800">Apple</span>
                </div>
                <input type="text" disabled value="apple-id-xyz123" className="flex-grow w-full md:w-auto rounded-lg border border-gray-200 bg-gray-50 text-gray-800 font-medium text-sm py-2 px-3 outline-none" />
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <button className="flex-1 md:flex-none bg-[#FFD700]/50 text-gray-900/50 font-bold py-1.5 px-4 rounded-lg text-sm cursor-not-allowed min-w-[70px]">Link</button>
                  <button className="flex-1 md:flex-none bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-4 rounded-lg text-sm transition-colors shadow-sm min-w-[70px]">Unlink</button>
                </div>
              </div>

              {/* Google */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-[150px]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="font-semibold text-gray-800">Google</span>
                </div>
                <input type="text" disabled value="Not connected" className="flex-grow w-full md:w-auto rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm py-2 px-3 outline-none" />
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <button className="flex-1 md:flex-none bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-1.5 px-4 rounded-lg text-sm transition-colors shadow-sm min-w-[70px]">Link</button>
                  <button className="flex-1 md:flex-none bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold py-1.5 px-4 rounded-lg text-sm transition-colors shadow-sm min-w-[70px]">Unlink</button>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Account Card */}
          <div className="bg-red-50/50 rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="font-display text-lg font-bold text-red-700">Delete Account</h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-800 font-medium mb-2">Once you delete your account, there is no going back. Please be certain.</p>
                <p className="text-gray-500 text-sm">This will permanently delete your profile, course progress, and associated data.</p>
              </div>
              <button className="bg-white border-2 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 font-bold py-2.5 px-6 rounded-lg transition-all shadow-sm active:scale-95">
                Delete Account
              </button>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}