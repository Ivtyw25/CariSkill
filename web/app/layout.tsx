import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css'; // Global styles
import '@xyflow/react/dist/style.css'; // Required for skill tree nodes

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'CariSkill - AI Learning & Career Prep',
  description: 'Your AI-Powered Path to Self-Mastery',
};

import { AuthProvider } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans text-charcoal-text bg-background-light dark:bg-background-dark dark:text-text-dark transition-colors duration-300 min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider user={user}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
