export interface OutlineItem {
  id: string;
  label: string;
  subLabel?: string;
  type: 'start' | 'node' | 'finish';
  isCompleted: boolean;
  isActive: boolean;
}

export interface MaterialResource {
  title: string;
  url: string;
  type: string;
  estimated_time_minutes: number;
}

export interface MaterialTopic {
  id: string;
  moduleId: string;
  title: string;
  part: string;
  duration: string;
  outline: OutlineItem[];
  // Legacy format
  description?: string[];
  video?: {
    title: string;
    url: string;
  };
  // New AI Generated format
  topic_title?: string;
  theory_explanation?: string;
  resources?: MaterialResource[];
  topic_total_time_minutes?: number;
}

export const materialTopics: Record<string, MaterialTopic> = {
  "m1": {
    id: "m1",
    moduleId: "m1",
    title: "Introduction to Databases",
    part: "Part 1 of 4",
    duration: "Approx. 45 mins",
    description: [
      "A database is an organized collection of structured information, or data, typically stored electronically in a computer system. A database is usually controlled by a database management system (DBMS).",
      "Together, the data and the DBMS, along with the applications that are associated with them, are referred to as a database system, often shortened to just database.",
      "Most modern databases use structured query language (SQL) for writing and querying data, allowing for efficient processing and accessibility."
    ],
    video: {
      title: "Video 1.1: Introduction to Database Systems",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    outline: [
      { id: "o1", label: "Start", subLabel: "Overview", type: "start", isCompleted: true, isActive: false },
      { id: "o2", label: "Core Concepts & Architecture", type: "node", isCompleted: false, isActive: true },
      { id: "o3", label: "Relational Data Model", type: "node", isCompleted: false, isActive: false },
      { id: "o4", label: "SQL Fundamentals", type: "node", isCompleted: false, isActive: false },
      { id: "o5", label: "Finish", type: "finish", isCompleted: false, isActive: false },
    ]
  },
  "py-mod-2": {
    id: "py-mod-2",
    moduleId: "py-mod-2",
    title: "Variables & Primitive Types",
    part: "Module 2",
    duration: "Approx. 30 mins",
    topic_title: "Variables and Data Types",
    theory_explanation: "Imagine your computer's memory as a vast, organized warehouse. When you're programming, you often need to store pieces of information – numbers, text, true/false values – so your program can use them later. This is where **variables** come in!\n\n*   **What it is:** A variable is like a named container or a labeled box in that warehouse. You give it a unique name (like `score` or `playerName`), and then you can store a piece of data inside it. The beauty is, the data inside the box can *change* – that's why it's called a \"variable\"!\n\n    But not all data is the same, right? You wouldn't store a delicate glass vase in the same type of box you'd use for a heavy bag of concrete. This is where **data types** become crucial. A data type tells the computer what *kind* of information a variable is expected to hold, which dictates how much memory it needs and what operations can be performed on it.\n\n*   **How it works:**\n    1.  **Declaration:** You first tell the computer you want a new variable and what type of data it will hold. For example, in many languages, you might say `int age;` (meaning \"I want a variable named `age` that will store an integer number\").\n    2.  **Assignment:** Then, you put a value into your variable: `age = 25;`. Now, the box labeled `age` contains the number `25`.\n    3.  **Usage:** You can then use the variable's name to retrieve or modify its value: `print(age);` would display `25`. Later, you could change it: `age = age + 1;` (now `age` is `26`).\n\n    Common data types you'll encounter include:\n    *   **Integers (`int`):** Whole numbers (e.g., `5`, `-10`, `0`). Perfect for counts, scores, or indices.\n    *   **Floating-point numbers (`float`, `double`):** Numbers with decimal points (e.g., `3.14`, `-0.5`). Essential for calculations involving fractions or precise measurements.\n    *   **Characters (`char`):** A single letter, symbol, or number (e.g., `'A'`, `'!'`, `'7'`).\n    *   **Booleans (`bool`):** Represents truth values – either `true` or `false`. Crucial for decision-making.\n    *   **Strings (`string`):** A sequence of characters (e.g., `\"Hello World!\"`, `\"Player1\"`). Used for names, messages, or any textual data.\n\n*   **Why it matters:**\n    *   **Flexibility:** Variables allow your programs to be dynamic. Instead of hardcoding values, you can store user input, calculation results, or changing game states. Imagine a game where the player's score never changes – pretty boring, right? Variables make it interactive!\n    *   **Readability:** Giving meaningful names to your variables (e.g., `totalScore` instead of just `x`) makes your code much easier to understand, both for you and for others.\n    *   **Competitive Programming Edge:** In competitive programming, you'll constantly need to store input values, intermediate calculation results, counts, flags, and more. Understanding how to choose the right data type for efficiency and accuracy (e.g., `long long` for very large integers to prevent overflow) is a critical skill that sets top competitors apart.\n\n    As the article and video highlight, variables are the fundamental building blocks for storing and manipulating information. They are the memory of your program, allowing it to remember and react.",
    topic_total_time_minutes: 18,
    resources: [
      {
        title: "Variables and Data Types in Programming: A Beginner's Guide",
        url: "https://dev.to/itsahsanmangal/variables-and-data-types-in-programming-a-beginners-guide-499g",
        type: "article",
        estimated_time_minutes: 5
      },
      {
        title: "Variables, Print Statements, Data Types, and Value Assignments",
        url: "https://www.youtube.com/watch?v=6pMA1CU1nt0",
        type: "youtube",
        estimated_time_minutes: 10
      }
    ],
    outline: [
      { id: "o1", label: "Start", subLabel: "Overview", type: "start", isCompleted: true, isActive: false },
      { id: "o2", label: "What is a Variable?", type: "node", isCompleted: true, isActive: false },
      { id: "o3", label: "Primitive Types (int, float, bool)", type: "node", isCompleted: false, isActive: true },
      { id: "o4", label: "Dynamic Typing", type: "node", isCompleted: false, isActive: false },
      { id: "o5", label: "Finish", type: "finish", isCompleted: false, isActive: false },
    ]
  }
};