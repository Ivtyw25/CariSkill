import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Retrieve existing resume_data
    const { data: profile } = await supabase
      .from("profiles")
      .select("resume_data")
      .eq("id", userId)
      .single();

    if (!profile || !profile.resume_data) {
       return NextResponse.json({ error: "No resume data found. Please analyse your resume first." }, { status: 400 });
    }

    // Fetch user's current roadmaps so we can avoid recommending them
    const { data: activeRoadmaps } = await supabase
      .from("roadmaps")
      .select("topic")
      .eq("user_id", userId);
      
    // Fetch explicitly ongoing or completed skills
    const { data: userSkills } = await supabase
      .from("user_skills")
      .select("title")
      .eq("user_id", userId)
      .in("status", ["Ongoing", "Completed"]);
    
    const activeTopicsArray = [
      ...(activeRoadmaps || []).map(r => r.topic),
      ...(userSkills || []).map(s => s.title)
    ];
    
    // Deduplicate array
    const activeTopics = Array.from(new Set(activeTopicsArray)).join(", ");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert career coach and technical recruiter.
      I have provided candidate's existing Resume Data JSON string:
      ${JSON.stringify(profile.resume_data)}

      Based on the candidate's skills and experience, recommend exactly 6 new specific skills (technologies, tools, or concepts) they should learn next to advance their career. 
      IMPORTANT: Do NOT recommend any of these skills because they are already learning them: [${activeTopics}].
      Assign a size "sm", "md", or "lg" to each skill to represent its importance ("lg" being the most important, "sm" being the least).
      
      Return ONLY a JSON array of exactly 6 objects with this exact structure:
      [
        { "title": "Skill Name 1", "size": "lg" },
        { "title": "Skill Name 2", "size": "md" },
        { "title": "Skill Name 3", "size": "md" },
        { "title": "Skill Name 4", "size": "sm" },
        { "title": "Skill Name 5", "size": "sm" },
        { "title": "Skill Name 6", "size": "sm" }
      ]
    `;

    const result = await model.generateContent([prompt]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    const recommendations = JSON.parse(responseText);

    // Overwrite existing 'Recommended' skills with the new ones
    if (recommendations && Array.isArray(recommendations) && recommendations.length === 6) {
      // First delete all existing recommended skills
      await supabase
        .from("user_skills")
        .delete()
        .eq("user_id", userId)
        .eq("status", "Recommended");

      // Insert new ones
      const skillsToInsert = recommendations.map((rec: any) => ({
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
    console.error("Gemini API Error (Refresh):", error);
    return NextResponse.json({ error: error.message || "Refresh failed." }, { status: 500 });
  }
}
