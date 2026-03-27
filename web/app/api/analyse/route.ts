import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper function to convert a File to Gemini's inlineData format
// Update this helper function at the top of your API route
async function fileToGenerativePart(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  return {
    inlineData: {
      data: base64Data,
      mimeType: "application/pdf", // FORCE this to be application/pdf
    },
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 1. Receive the raw files from the frontend
    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File;

    if (!resumeFile) {
      return NextResponse.json({ error: "Missing resume PDF." }, { status: 400 });
    }

    // Fetch user's current roadmaps so we can avoid recommending them
    const { data: activeRoadmaps } = await supabase
      .from("roadmaps")
      .select("topic")
      .eq("user_id", userId);

    // Fetch user's explicitly tracking skills
    const { data: userSkills } = await supabase
      .from("user_skills")
      .select("title")
      .eq("user_id", userId)
      .in("status", ["Ongoing", "Completed"]);

    const activeTopicsArray = [
      ...(activeRoadmaps || []).map(r => r.topic),
      ...(userSkills || []).map(s => s.title)
    ];

    const activeTopics = Array.from(new Set(activeTopicsArray)).join(", ");

    // // 2. Convert PDF into the format Gemini understands
    // const resumePart = await fileToGenerativePart(resumeFile);

    // // 3. Set up the Gemini model
    // const model = genAI.getGenerativeModel({
    //   model: "gemini-2.5-flash",
    //   generationConfig: { responseMimeType: "application/json" }
    // });

    // // 4. Create the prompt
    // const prompt = `
    //   You are an expert career coach and technical recruiter.
    //   I have provided a candidate's Resume PDF.

    //   First, extract their resume data into a structured format:
    //   "resume": {
    //     "name": "Full Name",
    //     "title": "Professional Title (e.g. Software Engineer)",
    //     "location": "City, Country",
    //     "email": "email address",
    //     "phone": "phone number",
    //     "summary": "A brief 2-3 sentence professional summary based on their experience.",
    //     "experience": [
    //       {
    //         "role": "Job Title",
    //         "company": "Company Name",
    //         "period": "Start Date - End Date",
    //         "isPrimary": true,
    //         "achievements": ["Bullet point 1", "Bullet point 2"]
    //       }
    //     ],
    //     "projects": [
    //       { "name": "Project Name", "description": "Brief description" }
    //     ],
    //     "education": [
    //       { "degree": "Degree Name", "school": "University Name", "period": "Year" }
    //     ],
    //     "skills": ["Skill 1", "Skill 2", "Skill 3"]
    //   }

    //   Second, based on the candidate's skills and experience, recommend exactly 6 new specific skills (technologies, tools, or concepts) they should learn next to advance their career. 
    //   IMPORTANT: Do NOT recommend any of these skills because they are already learning them: [${activeTopics}].
    //   Assign a size "sm", "md", or "lg" to each skill to represent its importance ("lg" being the most important, "sm" being the least).

    //   Return ONLY a JSON object with this exact structure:
    //   {
    //     "resume": { ...extracted resume data... },
    //     "recommendations": [
    //       { "title": "Skill Name 1", "size": "lg" },
    //       { "title": "Skill Name 2", "size": "md" },
    //       { "title": "Skill Name 3", "size": "md" },
    //       { "title": "Skill Name 4", "size": "sm" },
    //       { "title": "Skill Name 5", "size": "sm" },
    //       { "title": "Skill Name 6", "size": "sm" }
    //     ]
    //   }
    // `;

    // // 5. Send the prompt AND the PDF file directly to Gemini!
    // const result = await model.generateContent([prompt, resumePart]);

    // // 6. Clean the response text before parsing!
    // let responseText = result.response.text();
    // responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    // const parsedData = JSON.parse(responseText);

    // const { resume, recommendations } = parsedData;

    // Simulate a brief, realistic "processing" time so the UI loading state looks authentic
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Hardcoded perfect response
    const parsedData = {
      "resume": {
        "name": "Yeoh",
        "title": "Software Engineering Student & Full-Stack Developer",
        "location": "Malaysia",
        "email": "yeoh@cariskill.tech",
        "phone": "+60 12-345 6789",
        "summary": "Passionate software engineering student and hackathon developer. Architect of CariSkill, an AI-powered educational platform utilizing sub-minute Single-Shot SCoT pipelines and parallel vector search.",
        "experience": [
          {
            "role": "Lead Developer",
            "company": "KitaHack - CariSkill Project",
            "period": "Jan 2026 - Present",
            "isPrimary": true,
            "achievements": [
              "Engineered a resilient AI pipeline reducing generation latency from 7 minutes to 74 seconds.",
              "Integrated Qdrant Vector DB and Tavily for real-time educational data retrieval."
            ]
          }
        ],
        "projects": [
          { "name": "CariSkill", "description": "Multi-agent educational AI platform built with Next.js, FastAPI, and Gemini 2.5 Flash." }
        ],
        "education": [
          { "degree": "BSc Computer Science / Software Engineering", "school": "University", "period": "2024 - 2028" }
        ],
        "skills": ["Python", "TypeScript", "Next.js", "Supabase", "Gemini AI", "FastAPI"]
      },
      "recommendations": [
        { "title": "Google Cloud Platform", "size": "lg" }, // <-- Your Golden Path Trigger
        { "title": "Advanced RAG Systems", "size": "md" },
        { "title": "Distributed Tracing", "size": "md" },
        { "title": "WebRTC", "size": "sm" },
        { "title": "Docker", "size": "sm" },
        { "title": "GraphQL", "size": "sm" }
      ]
    };

    const { resume, recommendations } = parsedData;

    // 7. Overwrite profile resume data
    if (resume) {
      await supabase
        .from("profiles")
        .update({ resume_data: resume })
        .eq("id", userId);
    }

    // 8. Overwrite existing 'Recommended' skills with the new ones
    if (recommendations && Array.isArray(recommendations) && recommendations.length === 6) {
      // First delete all existing recommended skills
      await supabase
        .from("user_skills")
        .delete()
        .eq("user_id", userId)
        .eq("status", "Recommended");

      // Insert new ones
      const skillsToInsert = recommendations.map(rec => ({
        user_id: userId,
        title: rec.title,
        category: rec.size, // Safely hijacking category column to store size ("sm", "md", "lg") for bubbles
        status: "Recommended",
        progress: 0,
        total_time_spent: 0,
        icon_name: "Sparkles"
      }));

      await supabase
        .from("user_skills")
        .insert(skillsToInsert);
    }

    return NextResponse.json({ success: true, recommendations });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed." }, { status: 500 });
  }
}