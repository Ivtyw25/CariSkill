import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function fileToGenerativePart(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  return {
    inlineData: { data: base64Data, mimeType: "application/pdf" },
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File;

    if (!resumeFile) {
      return NextResponse.json({ error: "Missing resume PDF." }, { status: 400 });
    }

    const resumePart = await fileToGenerativePart(resumeFile);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert HR data extractor. Read the attached resume PDF and extract the details into a strict JSON format.
      
      Return ONLY a JSON object with exactly this structure. If information is missing, use empty strings or empty arrays:
      {
        "name": "Full Name",
        "title": "Professional Title (e.g. Software Engineer)",
        "location": "City, Country",
        "email": "email address",
        "phone": "phone number",
        "summary": "A brief 2-3 sentence professional summary based on their experience.",
        "experience": [
          {
            "role": "Job Title",
            "company": "Company Name",
            "period": "Start Date - End Date",
            "isPrimary": true,
            "achievements": ["Bullet point 1", "Bullet point 2"]
          }
        ],
        "projects": [
          { "name": "Project Name", "description": "Brief description" }
        ],
        "education": [
          { "degree": "Degree Name", "school": "University Name", "period": "Year" }
        ],
        "skills": ["Skill 1", "Skill 2", "Skill 3"],
        "recommended_skills": ["New Tech 1", "New Tech 2", "New Tech 3", "New Tech 4", "New Tech 5"]
      }

      Rule 1: For the first experience item, set "isPrimary" to true. For all others, set it to false.
      Rule 2: Analyze their current skills and experience to recommend exactly 5 highly relevant "recommended_skills" they should learn next to advance their career. These will be added to their learning roadmap.
    `;

    const result = await model.generateContent([prompt, resumePart]);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    const extractedData = JSON.parse(responseText);

    // 1. Save resume to profiles
    const { error: resumeError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        resume_data: extractedData,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (resumeError) {
      console.error("Failed to save resume to profiles:", resumeError);
    }

    // 2. Save recommended skills to user_skills
    if (extractedData.recommended_skills && Array.isArray(extractedData.recommended_skills)) {
      const skillsToInsert = extractedData.recommended_skills.map((skill: string) => ({
        user_id: user.id,
        title: skill,
        category: "md", // default bubble size for Explore page
        status: "Recommended"
      }));

      // Delete old recommendations first so they refresh beautifully
      await supabase.from("user_skills").delete().eq("user_id", user.id).eq("status", "Recommended");
      
      const { error: skillError } = await supabase.from("user_skills").insert(skillsToInsert);
      if (skillError) {
        console.error("Failed to insert recommended skills:", skillError);
      }
    }

    return NextResponse.json(extractedData);

  } catch (error: any) {
    console.error("Extraction API Error:", error);
    return NextResponse.json({ error: "Failed to extract data." }, { status: 500 });
  }
}