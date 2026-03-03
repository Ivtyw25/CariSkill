// lib/summary-data.ts

export interface SummaryResource {
  title: string;
  url: string;
  type: string;
  estimated_time_minutes: number;
}

export interface SummaryNote {
  moduleId: string;
  topicTag: string;
  subject: string;
  title: string;
  lastUpdated: string;
  keyTakeaways?: string[];
  coreConcepts?: {
    icon: string; // Material symbol name
    title: string;
    description: string;
  }[];
  cheatSheet?: {
    sqlStructure: string;
    properties: string[];
    dataTypes: string[];
  };
  // AI Generated Fields
  topic_title?: string;
  theory_explanation?: string;
  topic_total_time_minutes?: number;
  resources?: SummaryResource[];
}

export const summaryNotes: Record<string, SummaryNote> = {
  "m1": {
    moduleId: "m1",
    topicTag: "Topic 1.1",
    subject: "Databases",
    title: "Introduction to Databases",
    lastUpdated: "2 mins ago",
    keyTakeaways: [
      "A database is an organized collection of structured information, or data, typically stored electronically in a computer system.",
      "Database Management Systems (DBMS) serve as an interface between the database and its end users or programs.",
      "SQL (Structured Query Language) is the standard language for dealing with Relational Databases."
    ],
    coreConcepts: [
      { icon: "table_chart", title: "Relational Databases", description: "Data is organized into tables with rows and columns. Each row is a unique record." },
      { icon: "dns", title: "NoSQL Databases", description: "Non-relational databases that store data in formats other than tables, such as JSON." },
      { icon: "key", title: "Primary Key", description: "A unique identifier for a record in a table. It ensures no two rows have the same key." },
      { icon: "link", title: "Foreign Key", description: "A field in one table that refers to the primary key in another table, establishing a link." }
    ],
    cheatSheet: {
      sqlStructure: "SELECT column1, column2 \nFROM table_name \nWHERE condition;",
      properties: ["Atomicity", "Consistency", "Isolation", "Durability"],
      dataTypes: ["INT / INTEGER", "VARCHAR(n)", "BOOLEAN", "DATE / TIMESTAMP"]
    }
  },
  "py-mod-2": {
    moduleId: "py-mod-2",
    topicTag: "Module 2",
    subject: "Python Basics",
    title: "Variables & Primitive Types",
    lastUpdated: "Just now",
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
    ]
  }
};