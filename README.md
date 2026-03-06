# CariSkill: AI-Powered Skill Roadmap Generator

**Live Demo:** [https://cariskill-frontend.vercel.app/](https://cariskill-frontend.vercel.app/)

CariSkill is an advanced, multi-agent AI platform designed for anyone who wants to expand their tech skills but doesn't know where to start. While identifying missing competencies for job seekers is one of its powerful features, the true core of CariSkill is its ability to deeply understand a user's unique goals, time constraints, and experience level. It leverages this understanding to autonomously generate a highly personalized, interactive learning roadmap populated with dynamically scraped, high-quality micro-learning content.

## 🏗️ Technical Architecture

![Image of a multi-agent system architecture diagram showing an application frontend communicating with a backend orchestrating AI agents, web scrapers, and a database](./Architecture.png)

Our system is built on a highly scalable, serverless infrastructure designed to support intensive AI orchestration.

* **Frontend:** Next.js & React Flow
  * Provides a responsive user interface and renders the generated curriculum as an interactive Directed Acyclic Graph (DAG).
* **Backend:** Python (FastAPI) deployed on Google Cloud Run
  * Serves as the main endpoint and orchestrates the backend operations. We chose Cloud Run for our deployment to ensure robust compute power for our AI tasks.
* **Agent Framework & Scraping:** CrewAI & Tavily
  * **CrewAI:** The framework used to build and orchestrate our multilayer agent architecture.
  * **Tavily:** An AI-centric search engine integrated as the dedicated web scraping tool, allowing our agents to rapidly fetch and validate live web materials.
* **Cognitive Engine:** Google Gemini
  * The core LLM powering the reasoning capabilities of our agentic system. Gemini handles everything from analyzing user constraints to synthesizing the micro-learning theory, leveraging its massive context window to process thousands of lines of scraped documentation without data loss.
* **Data Grounding & Storage:** Firebase Vector Store & Supabase
  * **Firebase Vector Store:** Acts as our Retrieval-Augmented Generation (RAG) layer, storing embeddings of vetted educational data to strictly minimize LLM hallucinations.
  * **Supabase (PostgreSQL):** Stores application state, user profiles, and the massive `jsonb` payloads containing the generated micro-learning modules.

---

## ⚙️ Implementation Details

CariSkill's core logic is driven by a multi-agent architecture built on CrewAI, completely decoupling the initial analysis, high-level planning, and deep-level content generation into specialized workflows.

* **Gap Analyst Agent (Skill Gap & ROI Analysis):** For users targeting specific careers, this agent starts by analyzing the user's uploaded resume against real-world job advertisements to identify exact missing competencies. Instead of simply listing all missing skills, the agent calculates the Return on Investment (ROI) for each gap, prioritizing the highest-value skills first so users focus their effort where it matters most.
* **Architect Agent (Macro-Planning):** Whether acting on the prioritized skills from the Gap Analyst or direct input from a user exploring a new topic from scratch, the Gemini-powered Architect agent constructs a strict, Pydantic-validated blueprint. This structures the necessary learning objectives into a logical, prerequisite-based DAG node system. A dedicated QA Auditor agent then verifies this blueprint against the user's time constraints.
* **Scraper & Educator Agents (Micro-Learning):** Once the macro-blueprint is approved, the system delegates the specific sub-topics to the Micro-Learning Crew. The Scraper agent utilizes the Tavily search tool to fetch live, authoritative web resources (e.g., official documentation, YouTube tutorials), while the Educator agent synthesizes those resources into bite-sized, high-yield theoretical explanations.

---

## 🚧 Challenges Faced

* **Long Agent Response Times:** The multi-agent workflow inherently takes a significant amount of time to research, scrape, and generate content. 
  * *Solution:* We solved this by implementing asynchronous functions, allowing the agents to run tasks concurrently rather than sequentially. The system executes multiple tasks in parallel and seamlessly combines the results at the end of the flow, drastically reducing the total wait time for the user.
* **Selecting the Optimal AI Stack and Frameworks:** It was difficult to identify the right combination of tools that could handle complex, autonomous AI operations without data loss or pipeline failures.
  * *Solution:* We specifically chose **CrewAI** because it provides high velocity for development, and good for orchestrating role-playing agents (like our Architect and Scraper) and smoothly passing state between them. We paired this with **Google Gemini** as our core engine because its industry-leading massive context window is uniquely capable of processing the thousands of lines of scraped web data and detailed resumes our system generates, preventing the data loss and hallucinations common in other LLMs.

---

## 🚀 Future Roadmap

* **Predictive Skill Recommendations:** As our user base scales, we will export anonymized learning trend data to Google BigQuery. By applying data analysis to these macro-trends, CariSkill will proactively recommend emerging, high-value skills to our users before they become mainstream requirements.
* **Community-Driven Social Learning:** Transitioning from a single-player utility to a multiplayer ecosystem. Users will be able to publish, rate, and share their AI-generated roadmaps, creating a massive library of user-generated content and allowing beginners to follow the exact learning paths of industry veterans.
* **B2B Enterprise Upskilling:** We plan to rapidly expand our user base by transitioning from individual B2C users to bulk B2B licensing for universities and corporate HR departments. By integrating Google BigQuery, we can securely process massive, organizational-level datasets. This allows the platform to support thousands of concurrent users per institution while providing administrators with real-time analytics dashboards to track bulk upskilling progress.

---