// lib/profile-data.ts
import {
  Code, PenTool, Brain, Database, Layout,
  Terminal, Calendar, FileText, Target, BarChart2, BookOpen
} from 'lucide-react';

export type SkillStatus = 'Ongoing' | 'Done' | 'Cancelled';

export interface Skill {
  id: number;
  title: string;
  category: string;
  progress: number;
  timeLeft: string;
  icon: any; // Using 'any' for Lucide icon types to keep it simple
  iconBg: string;
  iconColor: string;
  status: SkillStatus;
}

export const mySkillsData: Skill[] = [
  // --- ONGOING SKILLS ---
  {
    id: 1,
    title: 'Advanced React Patterns',
    category: 'Frontend Development',
    progress: 75,
    timeLeft: '2h left',
    icon: Code,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    status: 'Ongoing'
  },
  {
    id: 2,
    title: 'UI/UX Principles',
    category: 'Design Theory',
    progress: 32,
    timeLeft: '8h left',
    icon: PenTool,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-500',
    status: 'Ongoing'
  },
  {
    id: 3,
    title: 'Critical Thinking',
    category: 'Soft Skills',
    progress: 15,
    timeLeft: '4h left',
    icon: Brain,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
    status: 'Ongoing'
  },

  // --- DONE SKILLS ---
  {
    id: 4,
    title: 'SQL Fundamentals',
    category: 'Database Management',
    progress: 100,
    timeLeft: 'Completed',
    icon: Database,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-500',
    status: 'Done'
  },
  {
    id: 5,
    title: 'Responsive Web Design',
    category: 'Frontend Development',
    progress: 100,
    timeLeft: 'Completed',
    icon: Layout,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-500',
    status: 'Done'
  },

  // --- CANCELLED SKILLS ---
  {
    id: 6,
    title: 'Linux Command Line',
    category: 'DevOps',
    progress: 10,
    timeLeft: 'Dropped',
    icon: Terminal,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
    status: 'Cancelled'
  },
];

export const sidebarNav = [
  { name: 'My Skills', icon: BookOpen, href: '/profile' },
  { name: 'Calendar', icon: Calendar, href: '/calendar' },
  { name: 'My Resume', icon: FileText, href: '/resume' },
  { name: 'Target Job', icon: Target, href: '/target-job' },
  { name: 'Learning Report', icon: BarChart2, href: '/report' },
];