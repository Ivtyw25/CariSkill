// lib/skill-details.ts

export interface RoadmapStep {
  label: string;
  subLabel: string;
}

export interface SkillModule {
  id: string;
  title: string;
  description: string;
  isLocked: boolean;
  level: number;
}

export interface DetailedRoadmap {
  id: string;
  title: string;
  userCount: string;
  progressPercent: number;
  currentStepIndex: number; // 0 for Start, 1 for Step 2, etc.
  steps: RoadmapStep[];
  modules: SkillModule[];
}

export const skillRoadmaps: Record<string, DetailedRoadmap> = {
  // Database mock track
  "track-1": {
    id: "track-1",
    title: "Database",
    userCount: "123,456",
    progressPercent: 65,
    currentStepIndex: 2,
    steps: [
      { label: "Level 1", subLabel: "" },
      { label: "Level 2", subLabel: "" },
      { label: "Level 3", subLabel: "" },
      { label: "Level 4", subLabel: "" }
    ],
    modules: [
      { id: "m1", title: "Introduction to Databases", description: "Fundamental concepts and architecture", isLocked: false, level: 1 },
      { id: "m2", title: "SQL Fundamentals", description: "SELECT, WHERE, and basic filtering", isLocked: false, level: 1 },
      { id: "m3", title: "Relational Design & Normalization", description: "1NF, 2NF, 3NF and Entity Relationships", isLocked: false, level: 2 },
      { id: "m4", title: "Advanced Joins & Subqueries", description: "Complex data retrieval techniques", isLocked: true, level: 3 }
    ]
  },

  // Python mock track
  "tech-python": {
    id: "tech-python",
    title: "Python Programming",
    userCount: "450,210",
    progressPercent: 40,
    currentStepIndex: 1,
    steps: [
      { label: "Level 1", subLabel: "" },
      { label: "Level 2", subLabel: "" },
      { label: "Level 3", subLabel: "" },
      { label: "Level 4", subLabel: "" }
    ],
    modules: [
      // Level 1: Basics
      { id: "py-mod-2", title: "Variables & Primitive Types", description: "Learn about ints, floats, strings, and booleans in Python.", isLocked: false, level: 1 },
      { id: "py2", title: "Control Flow", description: "If/Else statements and logic operators.", isLocked: false, level: 1 },
      { id: "py3", title: "Functions & Scope", description: "Defining reusable code blocks and understanding variable scope.", isLocked: false, level: 1 },

      // Level 2: Structures
      { id: "py4", title: "Lists & Tuples", description: "Working with ordered sequences of data.", isLocked: false, level: 2 },
      { id: "py5", title: "Dictionaries & Sets", description: "Key-value pairs and unique collections.", isLocked: false, level: 2 },
      { id: "py6", title: "Error Handling", description: "Try/Except blocks and raising custom exceptions.", isLocked: true, level: 2 },

      // Level 3: Advanced Concepts
      { id: "py7", title: "Classes & Objects", description: "Introduction to Object-Oriented Programming (OOP) in Python.", isLocked: true, level: 3 },
      { id: "py8", title: "Inheritance & Polymorphism", description: "Extending classes and duck typing.", isLocked: true, level: 3 },

      // Level 4: Mastery
      { id: "py9", title: "Decorators & Generators", description: "Advanced functional programming concepts in Python.", isLocked: true, level: 4 }
    ]
  },

  // Design UI/UX mock track
  "design-uiux": {
    id: "design-uiux",
    title: "UI/UX Foundations",
    userCount: "98,300",
    progressPercent: 85,
    currentStepIndex: 3,
    steps: [
      { label: "Level 1", subLabel: "" },
      { label: "Level 2", subLabel: "" },
      { label: "Level 3", subLabel: "" },
      { label: "Level 4", subLabel: "" }
    ],
    modules: [
      { id: "ux1", title: "Intro to Design Thinking", description: "Understanding user needs and empathizing with the audience.", isLocked: false, level: 1 },
      { id: "ux2", title: "Color Theory", description: "How to combine colors effectively for accessibility and mood.", isLocked: false, level: 1 },

      { id: "ux3", title: "Typography Basics", description: "Choosing fonts, kerning, and establishing a type hierarchy.", isLocked: false, level: 2 },
      { id: "ux4", title: "Spacing & Layout System", description: "Using grids and the 8px baseline rule.", isLocked: false, level: 2 },

      { id: "ux5", title: "Low-Fidelity Wireframing", description: "Sketching quick ideas and user flows.", isLocked: false, level: 3 },
      { id: "ux6", title: "High-Fidelity UI", description: "Translating wireframes into polished, pixel-perfect designs.", isLocked: true, level: 3 }
    ]
  }
};