'use client';

import { LogOut } from 'lucide-react';
import { sidebarNav } from '@/lib/profile-data';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata?.full_name || 'Anonymous User';
        setUserName(fullName);

        // Use ui-avatars as default if no avatar_url is provided
        const avatar = user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=ffd700&color=000&size=150&bold=true`;
        setAvatarUrl(avatar);
      }
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="lg:col-span-1 flex flex-col gap-6">
      {/* User Profile Card */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#FFD700] to-yellow-200">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${userName} Avatar`}
                className="w-full h-full rounded-full border-4 border-white object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full border-4 border-white bg-gray-200 animate-pulse" />
            )}
          </div>
          {/* Online Status Dot */}
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
        </div>

        <div className="flex flex-col items-center">
          {userName ? (
            <h2 className="font-display text-2xl font-bold text-gray-900">{userName}</h2>
          ) : (
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded-md" />
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 py-4">
        <nav className="flex flex-col">
          {sidebarNav.map((item) => {
            const isActive = pathname === item.href;

            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-4 px-8 py-4 text-left font-medium transition-colors ${isActive
                  ? 'border-l-4 border-[#FFD700] text-gray-900 bg-yellow-50/50'
                  : 'border-l-4 border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </button>
            );
          })}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-4 px-8 py-4 w-full text-left font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}