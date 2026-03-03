// lib/analyse-data.ts

export interface SkillItem {
  id: string;
  name: string;
}

export interface AnalysisResult {
  matchPercentage: number;
  mustHave: SkillItem[];
  useful: SkillItem[];
  mightNeed: SkillItem[];
}

export const mockAnalysisResults: AnalysisResult = {
  matchPercentage: 68,
  mustHave: [
    { id: "m1", name: "Python Programming" },
    { id: "m2", name: "Data Visualization" },
    { id: "m3", name: "Machine Learning" },
    { id: "m4", name: "Statistical Modeling" } // 4 items
  ],
  useful: [
    { id: "u1", name: "SQL Database" },
    { id: "u2", name: "Git / Version Control" } // 2 items
  ],
  mightNeed: [
    { id: "n1", name: "Docker" },
    { id: "n2", name: "Kubernetes" },
    { id: "n3", name: "Cloud Fundamentals" },
    { id: "n4", name: "FastAPI" },
    { id: "n5", name: "NoSQL Databases" } // 5 items
  ]
};