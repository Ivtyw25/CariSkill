// lib/quiz-data.ts

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  hint: string; // Added hint field
}

export interface QuizSet {
  moduleId: string;
  title: string;
  questions: QuizQuestion[];
}

export const quizSets: Record<string, QuizSet> = {
  "m1": {
    moduleId: "m1",
    title: "Introduction to Databases",
    questions: [
      {
        id: "q1",
        question: "What is the primary function of a Database Management System (DBMS)?",
        options: [
          "To design the user interface of an application",
          "To serve as an interface between the database and its end users",
          "To physically repair broken hard drives",
          "To compile programming code into machine language"
        ],
        correctAnswerIndex: 1,
        explanation: "A DBMS is specialized software that acts as an intermediary, allowing users to safely access, manage, and update the data stored within a database.",
        hint: "Think about what the word 'Management' implies in software terms—it's about acting as a middleman."
      },
      {
        id: "q2",
        question: "Which SQL constraint is used to ensure that a column cannot have a NULL value?",
        options: [
          "UNIQUE",
          "NOT NULL",
          "PRIMARY KEY",
          "DEFAULT"
        ],
        correctAnswerIndex: 1,
        explanation: "The NOT NULL constraint specifically enforces a column to NOT accept NULL values, meaning you must always provide a value when inserting or updating a record.",
        hint: "The answer is quite literal to the requirement of the question."
      },
      {
        id: "q3",
        question: "Which acronym represents the properties that guarantee reliable database transactions?",
        options: [
          "BASE",
          "CRUD",
          "SOLID",
          "ACID"
        ],
        correctAnswerIndex: 3,
        explanation: "ACID stands for Atomicity, Consistency, Isolation, and Durability. These properties ensure that database transactions are processed reliably.",
        hint: "It sounds like a corrosive chemical."
      }
    ]
  },
  "py-mod-2": {
    moduleId: "py-mod-2",
    title: "Variables & Primitive Types",
    questions: [
      {
        id: "q1",
        question: "Which of the following is NOT a primitive data type in Python?",
        options: [
          "Integer (int)",
          "Float (float)",
          "List (list)",
          "Boolean (bool)"
        ],
        correctAnswerIndex: 2,
        explanation: "Lists are complex data structures (collections), whereas integers, floats, and booleans are basic primitive types.",
        hint: "Think about which one contains multiple items."
      },
      {
        id: "q2",
        question: "How do you correctly assign the integer value 10 to a variable named 'score' in Python?",
        options: [
          "int score = 10",
          "let score = 10",
          "score = 10",
          "score := 10"
        ],
        correctAnswerIndex: 2,
        explanation: "Python does not require declaring the type (like 'int') or using keywords like 'let'. You just write the variable name, an equals sign, and the value.",
        hint: "Python syntax is known for being extremely minimal and readable."
      },
      {
        id: "q3",
        question: "What is the result of the following assignment? `is_active = False`",
        options: [
          "Creates a String variable containing the word 'False'",
          "Creates a Boolean variable with a false truth value",
          "Throws a SyntaxError because false should be lowercase",
          "Creates an Integer variable with a value of 0"
        ],
        correctAnswerIndex: 1,
        explanation: "In Python, 'True' and 'False' (with capital first letters) are the built-in boolean types.",
        hint: "Notice the capital 'F' without any quotation marks around it."
      },
      {
        id: "q4",
        question: "Because Python is dynamically typed, what happens if you run:\n`x = 5`\n`x = \"Hello\"`",
        options: [
          "The program crashes with a TypeError",
          "The string 'Hello' is converted into a number",
          "The variable x is reassigned a string value successfully",
          "The second line is ignored and x remains 5"
        ],
        correctAnswerIndex: 2,
        explanation: "Dynamic typing allows variables to change types freely during runtime. The container 'x' simply drops the integer 5 and holds the string 'Hello' instead.",
        hint: "Dynamic typing means variables are just labels, they aren't bound to a specific kind of data forever."
      }
    ]
  }
};