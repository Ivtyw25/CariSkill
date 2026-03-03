import { Database, Terminal, PenTool, LucideIcon } from 'lucide-react';

// 1. Raw Database Interfaces
export interface Bookmark {
  moduleId: string;
  title: string;
  type: 'summary' | 'material' | 'flashcard' | 'quiz';
  timestamp: string;
}

export const activeBookmarks: string[] = ["m1", "b1", "b4"]; 

export const toggleBookmarkAPI = async (moduleId: string) => {
  console.log(`Toggling bookmark for: ${moduleId}`);
  return true;
};

// 2. UI Presentation Interfaces & Data
export interface BookmarkItem {
  id: string;
  title: string;
  module: string;
  link: string;
  type: 'summary' | 'material' | 'flashcard' | 'quiz'; // Added type
}

export interface BookmarkCategory {
  id: string;
  category: string;
  icon: LucideIcon;
  items: BookmarkItem[];
}

// Updated with real links and specific content types
export const bookmarkUIData: BookmarkCategory[] = [
  {
    id: "cat-1",
    category: "Database",
    icon: Database,
    items: [
      { id: "b1", title: "Introduction Flashcards", module: "Introduction to Databases", link: "/skill/database/m1/flashcards", type: "flashcard" },
      { id: "b2", title: "SQL Syntax Quiz", module: "SQL Fundamentals", link: "/skill/database/m2/quiz", type: "quiz" },
      { id: "b3", title: "Normalization Guide Material", module: "Relational Design", link: "/skill/database/m3/materials", type: "material" }
    ]
  },
  {
    id: "cat-2",
    category: "Python Programming",
    icon: Terminal,
    items: [
      { id: "b4", title: "List Comprehensions Material", module: "Advanced Python Structures", link: "/skill/python-101/m4/materials", type: "material" },
      { id: "b5", title: "OOP Basics Quiz", module: "Object-Oriented Programming", link: "/skill/python-101/m5/quiz", type: "quiz" }
    ]
  },
  {
    id: "cat-3",
    category: "UX Design",
    icon: PenTool,
    items: [
      { id: "b6", title: "Wireframing Principles Summary", module: "Prototyping & Wireframing", link: "/skill/ux-design/m1/summary", type: "summary" }
    ]
  }
];