export interface RoadmapModule {
  id: string;
  title: string;
  description: string;
  duration?: string;
  obj?: string;
  items?: string[];
  status: 'completed' | 'current' | 'locked';
}

export interface SkillTrack {
  id: string;
  title: string;
  tagline: string;
  progress: number;
  estimatedTime: string;
  welcomeMessage: string;
  quote: {
    text: string;
    author: string;
  };
  modules: RoadmapModule[];
}

export const skillTracks: Record<string, SkillTrack> = {
  "python-101": {
    id: "python-101",
    title: "Mastering Python Programming",
    tagline: "Your adventure from novice to expert starts here.",
    progress: 0,
    estimatedTime: "15 mins",
    welcomeMessage: "Ready to master a new skill? Your roadmap is set. Begin your first lesson to unlock the path ahead.",
    quote: {
      text: "The journey of a thousand miles begins with one step.",
      author: "Lao Tzu"
    },
    modules: [
      { id: "m1", title: "Basic Syntax", description: "Variables, Loops, Conditions", status: "locked" },
      { id: "m2", title: "Data Structures", description: "Lists, Dictionaries, Sets", status: "locked" },
      { id: "m3", title: "Functions & Modules", description: "Mastering reusability and scope.", status: "locked" },
      { id: "m4", title: "Object-Oriented Programming", description: "Classes, Objects, Inheritance", status: "locked" },
      { id: "m5", title: "API Integration", description: "REST, JSON, Requests", status: "locked" }
    ]
  }
};

// Helper function to handle dynamic IDs
export const getSkillTrack = (id: string): SkillTrack => {
  // If the skill exists in our hardcoded data, return it
  if (skillTracks[id]) return skillTracks[id];

  // Otherwise, generate a "Custom" roadmap so the app doesn't 404
  const formattedTitle = id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return {
    id: id,
    title: formattedTitle,
    tagline: `Your personalized path to mastering ${formattedTitle}.`,
    progress: 0,
    estimatedTime: "20 mins",
    welcomeMessage: `Welcome to your custom ${formattedTitle} roadmap! We've tailored these steps based on your goals.`,
    quote: {
      text: "Knowledge is power.",
      author: "Francis Bacon"
    },
    modules: [
      { id: "m1", title: "Foundations", description: `Introduction to ${formattedTitle} core concepts.`, status: "locked" },
      { id: "m2", title: "Intermediate Techniques", description: "Deep dive into more complex features.", status: "locked" },
      { id: "m3", title: "Practical Application", description: "Building your first real-world project.", status: "locked" },
      { id: "m4", title: "Advanced Mastery", description: "Expert-level optimization and best practices.", status: "locked" }
    ]
  };
};