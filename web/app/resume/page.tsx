'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { Upload, Printer, MapPin, Mail, Phone, Loader2 } from 'lucide-react';
import { resumeData as fallbackData } from '@/lib/resume-data';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResumePage() {
  const router = useRouter();

  // State to hold the resume data
  const [data, setData] = useState<any>(null);

  // On page load, check if we have newly extracted data from the upload page
  useEffect(() => {
    const savedData = sessionStorage.getItem('extractedResume');
    if (savedData) {
      setData(JSON.parse(savedData));
    } else {
      setData({
        name: "",
        title: "",
        location: "",
        email: "",
        phone: "",
        summary: "",
        experience: [],
        projects: [],
        education: [],
        skills: []
      });
    }
  }, []);

  // Trigger the browser's native print dialog
  const handlePrint = () => {
    window.print();
  };

  // Prevent rendering errors before data loads
  if (!data) {
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
        {/* Hide Background Pattern during printing */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px] print:hidden" />

        <div className="w-full max-w-7xl z-10 grid grid-cols-1 lg:grid-cols-4 gap-8 print:block print:w-full print:max-w-none">

          {/* Hide Sidebar during printing */}
          <div className="lg:col-span-1 print:hidden">
            <Sidebar />
          </div>

          <div className="lg:col-span-3 print:col-span-4 flex flex-col h-full space-y-6 print:space-y-0">

            {/* Action Buttons (Hidden on Print) */}
            <div className="flex items-center gap-4 print:hidden">
              <Link
                href="/upload"
                className="bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold h-14 px-8 rounded-xl shadow-md transition-all flex items-center gap-3 transform active:scale-95 text-lg"
              >
                <Upload className="w-6 h-6 stroke-[2.5]" />
                Upload New
              </Link>
              <button
                onClick={handlePrint}
                className="bg-white hover:bg-gray-50 text-gray-700 font-semibold h-14 w-14 rounded-xl shadow-sm border border-gray-200 transition-all flex items-center justify-center transform active:scale-95"
                title="Print Resume"
              >
                <Printer className="w-6 h-6" />
              </button>
            </div>

            {/* Resume Document - Removed inline style for Tailwind shadow class */}
            <div className="bg-white rounded-3xl p-8 lg:p-12 border border-gray-100 min-h-[800px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03),0_10px_15px_-3px_rgba(0,0,0,0.05)] print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0">

              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start mb-10 border-b border-gray-100 pb-8">
                <div className="mb-4 md:mb-0">
                  <h1 className="font-display font-bold text-4xl text-gray-900 mb-2">{data.name}</h1>
                  <p className="text-xl text-gray-500 font-medium">{data.title}</p>
                </div>
                <div className="md:text-right space-y-2 text-gray-500 text-sm">
                  <p className="flex items-center md:justify-end gap-2"><MapPin className="w-4 h-4" /> {data.location}</p>
                  <p className="flex items-center md:justify-end gap-2"><Mail className="w-4 h-4" /> {data.email}</p>
                  <p className="flex items-center md:justify-end gap-2"><Phone className="w-4 h-4" /> {data.phone}</p>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-10">
                <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-4 border-l-4 border-[#FFD700] pl-3">Summary</h3>
                <p className="text-gray-600 leading-relaxed">
                  {data.summary}
                </p>
              </div>

              {/* Experience */}
              <div className="mb-10">
                <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-6 border-l-4 border-[#FFD700] pl-3">Experience</h3>
                <div className="space-y-8">
                  {data.experience.map((job: any, idx: number) => (
                    <div key={idx} className="relative pl-6 border-l border-gray-200">
                      <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${job.isPrimary ? 'bg-[#FFD700] shadow-sm' : 'bg-gray-300'}`}></div>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-baseline mb-2">
                        <h4 className="font-bold text-gray-900 text-lg">{job.role}</h4>
                        <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full mt-2 sm:mt-0">{job.period}</span>
                      </div>
                      <p className={`font-medium mb-2 ${job.isPrimary ? 'text-[#CA8A04]' : 'text-gray-700'}`}>{job.company}</p>
                      <ul className="list-disc list-outside ml-4 text-gray-600 space-y-1">
                        {job.achievements.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              <div className="mb-10">
                <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-6 border-l-4 border-[#FFD700] pl-3">Projects</h3>
                <div className="space-y-6">
                  {data.projects.map((project: any, idx: number) => (
                    <div key={idx}>
                      <h4 className="font-bold text-gray-900">{project.name}</h4>
                      <p className="text-gray-600 text-sm mt-1">{project.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two Column Section for Education & Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-6 border-l-4 border-[#FFD700] pl-3">Education</h3>
                  <div className="space-y-6">
                    {data.education.map((edu: any, idx: number) => (
                      <div key={idx}>
                        <h4 className="font-bold text-gray-900">{edu.degree}</h4>
                        <p className="text-gray-500 text-sm">{edu.school} • {edu.period}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-6 border-l-4 border-[#FFD700] pl-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-yellow-50 text-gray-800 rounded-lg text-sm font-medium border border-yellow-100">
                        {skill}
                      </span>
                    ))}
                  </div>
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