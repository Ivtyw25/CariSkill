// lib/explore-data.ts
import { BarChart2, Shield, PenTool, Cpu, Cloud, Smartphone } from 'lucide-react';

export type BubbleSize = 'sm' | 'md' | 'lg';

export const exploreData = {
  hero: {
    analyseTitle: "Analyse Skill",
    analyseDesc: "Upload resume or job ad to find gaps",
    newSkillTitle: "New Skill",
    newSkillDesc: "Start from scratch and generate a custom roadmap"
  },
  suggestionsTitle: "Suggestions For You",
  suggestions: [
    { id: "s1", text: "Python", size: "lg" as BubbleSize, top: "50%", left: "50%", delay: 0 },
    { id: "s2", text: "UI Design", size: "md" as BubbleSize, top: "15%", left: "35%", delay: 0.5 },
    { id: "s3", text: "React", size: "md" as BubbleSize, top: "30%", left: "70%", delay: 1.2 },
    { id: "s4", text: "SEO", size: "sm" as BubbleSize, top: "45%", left: "15%", delay: 0.8 },
    { id: "s5", text: "Swift", size: "sm" as BubbleSize, top: "50%", left: "85%", delay: 1.5 },
    { id: "s6", text: "Marketing", size: "md" as BubbleSize, top: "80%", left: "25%", delay: 0.2 },
    { id: "s7", text: "DevOps", size: "md" as BubbleSize, top: "85%", left: "75%", delay: 1.8 }
  ],
  popularTitle: "Popular Now",
  popularSkills: [
    {
      id: "p1", title: "Data Science", desc: "Master data analysis and visualization techniques.",
      learners: "12k", icon: BarChart2
    },
    {
      id: "p2", title: "Cybersecurity", desc: "Protect systems and networks from digital attacks.",
      learners: "8.5k", icon: Shield
    },
    {
      id: "p3", title: "UX Design", desc: "Create intuitive and user-friendly interfaces.",
      learners: "15k", icon: PenTool
    },
    {
      id: "p4", title: "AI Ethics", desc: "Understanding the moral implications of AI.",
      learners: "5k", icon: Cpu
    },
    {
      id: "p5", title: "Cloud Computing", desc: "Learn AWS, Azure, and Cloud fundamentals.",
      learners: "10k", icon: Cloud
    },
    {
      id: "p6", title: "Mobile Dev", desc: "Build native iOS and Android applications.",
      learners: "18k", icon: Smartphone
    },
  ]
};