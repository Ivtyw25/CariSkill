'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DailyReviewTab from '@/components/DailyReviewTab';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function DailyReviewPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dueCount, setDueCount] = useState(0);
  const [reviewFact, setReviewFact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Due Count (7-3-2-1 logic)
      const REVIEWS = [1, 3, 7, 13];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let totalDue = 0;
      
      for (const offset of REVIEWS) {
        const start = new Date(today);
        start.setDate(today.getDate() - offset);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);

        const { count } = await supabase
          .from('node_progress')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('completed_at', start.toISOString())
          .lt('completed_at', end.toISOString());
        
        totalDue += (count || 0);
      }
      setDueCount(totalDue);

      // 2. Fetch Daily Fact
      const { data: fact } = await supabase
        .from('user_review_facts')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setReviewFact(fact);
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar isLoggedIn={!!user} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  // If not logged in, Navbar will handle the redirect or show login link
  // but we can also show a helper message here
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar isLoggedIn={false} />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-black text-gray-900">Please Log In</h1>
            <p className="text-gray-500">You need to be logged in to access your daily review sessions.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar isLoggedIn={true} />
      
      <main className="flex-1 bg-gradient-to-b from-yellow-50/30 to-white pb-20">
        <DailyReviewTab 
          initialFact={reviewFact} 
          initialDueCount={dueCount} 
          onRefresh={fetchData}
          isFullPage={true}
        />
      </main>

      <Footer />
    </div>
  );
}
