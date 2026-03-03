import Link from 'next/link';
import Image from 'next/image';
import { Twitter, Linkedin, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 pt-16 pb-8 z-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            {/* Updated Logo Section */}
            <Link href="/" className="block relative w-40 h-10 mb-6 group">
              <Image 
                src="/logo.png" 
                alt="CariSkill Logo" 
                fill 
                className="object-contain object-left group-hover:scale-105 transition-transform duration-300"
                priority
              />
            </Link>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Empowering self-learners through intelligent, personalized roadmaps and AI study tools.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Platform</h4>
            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/explore" className="hover:text-primary transition-colors">Browse Topics</Link></li>
              <li><Link href="/progress" className="hover:text-primary transition-colors">Roadmap Generator</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Study Tools</Link></li>
              <li><Link href="/analysis" className="hover:text-primary transition-colors">Skill Matcher</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Community</h4>
            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="#" className="hover:text-primary transition-colors">Success Stories</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Forum</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Events</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Support</h4>
            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400 dark:text-gray-600">© 2023 CariSkill Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="text-gray-400 hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></Link>
            <Link href="#" className="text-gray-400 hover:text-primary transition-colors"><Linkedin className="w-5 h-5" /></Link>
            <Link href="#" className="text-gray-400 hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}