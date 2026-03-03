'use client';

import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import {
  Building2, MapPin, DollarSign, Clock, CalendarDays,
  Printer, ChevronLeft, HeartPulse, Plane, GraduationCap, Coffee, Dumbbell, Loader2, CheckCircle2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

// Map icon strings to actual Lucide components
const IconMap: any = {
  DollarSign: DollarSign,
  HeartPulse: HeartPulse,
  Plane: Plane,
  GraduationCap: GraduationCap,
  Coffee: Coffee,
  Dumbbell: Dumbbell
};

export default function OriginalAdPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    const fetchAd = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('target_jobs')
        .select('original_ad')
        .eq('id', id)
        .single();

      if (!error && data?.original_ad) {
        setAd(data.original_ad);
      }
    };
    fetchAd();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (!ad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
        <Loader2 className="w-10 h-10 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900 print:bg-white">
      {/* Hide Navbar during printing */}
      <div className="print:hidden">
        <Navbar isLoggedIn={true} />
      </div>

      <main className="flex-grow relative flex justify-center py-10 px-4 sm:px-6 lg:px-8 print:p-0">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px] print:hidden" />

        <div className="w-full max-w-7xl z-10 grid grid-cols-1 lg:grid-cols-4 gap-8 print:block print:w-full print:max-w-none">

          {/* Hide Sidebar during printing */}
          <div className="lg:col-span-1 print:hidden">
            <Sidebar />
          </div>

          <div className="lg:col-span-3 print:col-span-4 flex flex-col h-full space-y-6 print:space-y-0">

            {/* Action Buttons (Hidden on Print) */}
            <div className="flex items-center justify-between print:hidden">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-colors"
              >
                <ChevronLeft className="w-5 h-5" /> Back to Analysis
              </button>

              <button
                onClick={handlePrint}
                className="bg-white hover:bg-gray-50 text-gray-700 font-semibold h-12 w-12 rounded-xl shadow-sm border border-gray-200 transition-all flex items-center justify-center transform active:scale-95"
                title="Print Job Ad"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>

            {/* Ad Document - Styled with arbitrary shadow for print stripping */}
            <div className="bg-white rounded-3xl p-8 lg:p-12 border border-gray-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03),0_10px_15px_-3px_rgba(0,0,0,0.05)] print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0">

              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start mb-10 pb-8 border-b border-gray-100">
                <div>
                  <h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-4 leading-tight">
                    {ad.title} <span className="text-gray-500 font-normal">@ {ad.company}</span>
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 md:gap-6 text-gray-500 text-sm font-medium">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {ad.location}</span>
                    <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> {ad.salary}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {ad.type}</span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {ad.posted}</span>
                  </div>
                </div>

                {/* Decorative Icon Box */}
                <div className="hidden md:flex w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8" />
                </div>
              </div>

              {/* About Role */}
              <div className="mb-10">
                <h3 className="font-display font-bold text-xl text-gray-900 mb-4 border-l-4 border-[#FFD700] pl-3">About the Role</h3>
                <div className="text-gray-600 leading-relaxed space-y-4 whitespace-pre-line">
                  {ad.about}
                </div>
              </div>

              {/* Responsibilities */}
              <div className="mb-10">
                <h3 className="font-display font-bold text-xl text-gray-900 mb-4 border-l-4 border-[#FFD700] pl-3">Responsibilities</h3>
                <ul className="list-none space-y-3">
                  {ad.responsibilities.map((item: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-gray-600">
                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div className="mb-10">
                <h3 className="font-display font-bold text-xl text-gray-900 mb-4 border-l-4 border-[#FFD700] pl-3">Requirements</h3>
                <ul className="list-none space-y-3">
                  {ad.requirements.map((item: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-gray-600">
                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="font-display font-bold text-xl text-gray-900 mb-6 border-l-4 border-[#FFD700] pl-3">Benefits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ad.benefits.map((benefit: any, idx: number) => {
                    const IconComponent = IconMap[benefit.icon] || CheckCircle2;
                    return (
                      <div key={idx} className="flex items-center gap-4 bg-gray-50/50 border border-gray-100 rounded-xl p-4 print:border-gray-300">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${benefit.bg} ${benefit.color} print:bg-transparent`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-800 text-sm">{benefit.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Hide Footer during printing */}
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}