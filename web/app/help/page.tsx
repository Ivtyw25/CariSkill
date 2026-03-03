'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Book, Briefcase, Calendar, Settings, 
  ChevronDown, MessageSquare, Mail, FileQuestion 
} from 'lucide-react';

// --- Mock Data for Help Center ---
const helpCategories = [
  { id: 'getting-started', title: 'Getting Started', icon: Book, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Basics of CariSkill and setting up your profile.' },
  { id: 'job-analysis', title: 'Resume & Job Analysis', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50', desc: 'How to use AI to find your skill gaps.' },
  { id: 'calendar', title: 'Study Calendar', icon: Calendar, color: 'text-green-500', bg: 'bg-green-50', desc: 'Managing your learning roadmap and schedule.' },
  { id: 'account', title: 'Account Settings', icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100', desc: 'Managing your data, linked accounts, and privacy.' },
];

const faqs = [
  {
    id: 1,
    question: "How does the Job Analysis feature work?",
    answer: "Our AI extracts the required skills from your uploaded Job Advertisement and compares them against your saved Resume. It then provides a matching score and highlights specific skills you need to acquire to become a top candidate."
  },
  {
    id: 2,
    question: "Can I export my study calendar to Google Calendar?",
    answer: "Currently, the Study Calendar is built specifically for the CariSkill platform to track your learning progress directly. Calendar exporting is on our roadmap for future updates!"
  },
  {
    id: 3,
    question: "How do I add a new skill to my roadmap?",
    answer: "When viewing an analyzed Job Detail page, look for the 'Skills to Acquire' section. Clicking 'Add to Roadmap' will automatically send you to the setup page to generate a learning plan for that specific skill."
  },
  {
    id: 4,
    question: "Is my resume data kept private?",
    answer: "Yes! Your resume data is stored securely and is only used to personalize your gap analysis and learning recommendations. We do not share your profile with third-party recruiters without your explicit consent."
  },
  {
    id: 5,
    question: "How do I unlink a Google or Apple account?",
    answer: "Navigate to your Account Settings via the top right profile dropdown. Under 'Linked Accounts', simply click the 'Unlink' button next to the connected service."
  }
];

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<number | null>(1); // Default open the first FAQ

  const toggleFaq = (id: number) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900 overflow-hidden">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex flex-col items-center py-12 px-4 h-full w-full">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-4xl mx-auto z-10 flex flex-col gap-12">
          
          {/* Hero & Search Section */}
          <motion.div initial="hidden" animate="show" variants={containerVariants} className="text-center flex flex-col items-center">
            <motion.h1 variants={itemVariants} className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How can we help you?
            </motion.h1>
            <motion.p variants={itemVariants} className="text-gray-600 text-lg mb-8 max-w-lg">
              Search our knowledge base or browse categories below to find exactly what you need.
            </motion.p>
            
            <motion.div variants={itemVariants} className="w-full max-w-2xl relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for answers (e.g., 'Upload Resume')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 bg-white focus:border-[#FFD700] focus:ring-4 focus:ring-[#FEF9C3] outline-none transition-all shadow-sm text-lg font-medium text-gray-800 placeholder:text-gray-400"
              />
            </motion.div>
          </motion.div>

          {/* Categories Grid */}
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {helpCategories.map((category) => (
              <motion.div 
                key={category.id}
                variants={itemVariants}
                whileHover={{ y: -4, shadow: 'md', borderColor: '#FFD700' }}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm cursor-pointer transition-colors group flex gap-5 items-start"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${category.bg} ${category.color} group-hover:scale-110 transition-transform`}>
                  <category.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-[#CA8A04] transition-colors">{category.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{category.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* FAQ Accordion Section */}
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-6">
              <FileQuestion className="w-7 h-7 text-[#CA8A04]" />
              <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>

            <div className="flex flex-col gap-4">
              {faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                
                return (
                  <div key={faq.id} className={`border rounded-2xl transition-colors overflow-hidden ${isOpen ? 'border-[#FFD700] bg-yellow-50/30' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                    <button 
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                    >
                      <span className="font-bold text-lg text-gray-900 pr-4">{faq.question}</span>
                      <motion.div 
                        animate={{ rotate: isOpen ? 180 : 0 }} 
                        transition={{ duration: 0.2 }}
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isOpen ? 'bg-[#FFD700] text-gray-900' : 'bg-gray-100 text-gray-500'}`}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </button>
                    
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-5 pb-5 text-gray-600 leading-relaxed border-t border-gray-100/50 mt-2 pt-4">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Contact CTA */}
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="bg-gray-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#FFD700] rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
            
            <h2 className="font-display text-3xl font-bold mb-4 relative z-10">Still need help?</h2>
            <p className="text-gray-300 mb-8 max-w-lg mx-auto relative z-10">
              Can't find the answer you're looking for? Our support team is ready to help you navigate your learning journey.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <button className="bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-3 px-8 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5" /> Chat with Us
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" /> Email Support
              </button>
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
}