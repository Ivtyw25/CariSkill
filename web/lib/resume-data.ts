// lib/resume-data.ts

export const resumeData = {
  name: "Tan Jing En",
  title: "Software Engineering Student & Full-Stack Developer",
  location: "Penang, Malaysia",
  email: "tan.jingen@student.usm.my",
  phone: "+60 12-345 6789",
  summary: "Software Engineering student at Universiti Sains Malaysia (USM) with a strong focus on full-stack web development. Experienced in designing scalable applications, managing relational databases, and leading technical teams. Passionate about solving real-world problems through efficient, user-centric code.",
  experience: [
    {
      role: "IT Solution Developer Intern",
      company: "Bosch PgP5 Plant",
      period: "Q1 2026 Intake",
      isPrimary: true, // Used to color the timeline dot
      achievements: [
        "Developing and optimizing internal IT solutions and dashboards for manufacturing processes.",
        "Collaborating with cross-functional teams to improve system architecture and database design."
      ]
    },
    {
      role: "Head of Fullstack Development",
      company: "Google Developer Groups (GDG) on Campus USM",
      period: "2025 - Present",
      isPrimary: false,
      achievements: [
        "Led technical workshops, including 'Ng-Spicy: Building Hot Apps with Firebase' to educate peers on modern web technologies.",
        "Managed development teams to build and maintain community-driven platforms."
      ]
    },
    {
      role: "Clarinetist",
      company: "University Wind Orchestra",
      period: "2024 - Present",
      isPrimary: false,
      achievements: [
        "Participated in multiple national-level performances and music competitions.",
        "Demonstrated strong teamwork, discipline, and dedication through rigorous weekly rehearsals."
      ]
    }
  ],
  projects: [
    {
      name: "Univent",
      description: "An online event management platform tailored for university students, built with Angular and centralized dashboards to streamline event discovery and registration."
    },
    {
      name: "Harvest Hub",
      description: "An e-marketplace connecting farmers directly with consumers to sell fresh produce and effectively manage surplus inventory."
    },
    {
      name: "FoodBridge & 404 Found",
      description: "Developed a centralized food bank database system (FoodBridge) and built a corporate website using React.js and Node.js for team '404 Found'."
    }
  ],
  education: [
    {
      degree: "Bachelor of Computer Science (Software Engineering)",
      school: "Universiti Sains Malaysia (USM)",
      period: "Expected Graduation: 2027"
    }
  ],
  skills: [
    "Angular", "React.js", "Node.js", "Firebase", "Oracle APEX", "SQL", "Database Design", "System Modeling"
  ]
};