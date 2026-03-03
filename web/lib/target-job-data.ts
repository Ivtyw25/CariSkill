// lib/target-job-data.ts
import { PenTool, Code, LayoutTemplate } from 'lucide-react';

export interface TargetJob {
  id: number;
  title: string;
  company: string;
  dateAdded: string;
  icon: any; // Using 'any' for Lucide icon types
  colorTheme: 'blue' | 'purple' | 'green' | 'gray';
}

export const targetJobsData: TargetJob[] = [
  { 
    id: 1, 
    title: 'Senior Product Designer', 
    company: 'TechCorp', 
    dateAdded: 'Jan 12, 2026', 
    icon: PenTool, 
    colorTheme: 'blue' 
  },
  { 
    id: 2, 
    title: 'Frontend Developer', 
    company: 'Creative Solutions', 
    dateAdded: 'Dec 28, 2025', 
    icon: Code, 
    colorTheme: 'purple' 
  },
  { 
    id: 3, 
    title: 'UX Researcher', 
    company: 'DataFlow Inc.', 
    dateAdded: 'Dec 15, 2025', 
    icon: LayoutTemplate, 
    colorTheme: 'green' 
  },
];