// lib/job-detail-data.ts

export interface SkillToAcquire {
  name: string;
  priority: 'high' | 'medium' | 'low';
}

export interface JobDetail {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  adLink: string;
  theme: 'blue' | 'purple' | 'green';
  stats: {
    matchingScore: number;
    criticalGaps: number;
    timeToReady: string;
  };
  skillsHave: string[];
  skillsAcquire: SkillToAcquire[];
}

export const jobDetailsData: Record<string, JobDetail> = {
  "1": {
    id: "1",
    title: "Senior Product Designer",
    company: "TechCorp",
    location: "San Francisco, CA (Remote)",
    salary: "$140k - $180k",
    adLink: "/target-job/1/ad",
    theme: "blue",
    stats: {
      matchingScore: 78,
      criticalGaps: 2,
      timeToReady: "4 Weeks"
    },
    skillsHave: [
      "User Research",
      "Figma & Prototyping",
      "Visual Design",
      "Agile Methodology",
      "Mobile First Design"
    ],
    skillsAcquire: [
      { name: "Design Systems", priority: "high" },
      { name: "Stakeholder Management", priority: "high" },
      { name: "Design Tokens", priority: "medium" },
      { name: "Accessibility (WCAG)", priority: "medium" }
    ]
  }
};