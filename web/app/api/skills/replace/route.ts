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

    const { addedSkill } = await req.json();

    if (!addedSkill) {
      return NextResponse.json({ error: "Missing addedSkill in payload" }, { status: 400 });
    }

    // 1. Update the status of the added skill from Recommended to Ongoing (if it was a recommendation)
    await supabase
      .from("user_skills")
      .update({ status: "Ongoing" })
      .eq("user_id", userId)
      .eq("title", addedSkill)
      .eq("status", "Recommended");

    // 2. Fetch the user's resume_data from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("resume_data")
      .eq("id", userId)
      .single();

    const resumeData = profile?.resume_data ? JSON.stringify(profile.resume_data) : "No resume provided.";

    // 3. Fetch active roadmaps
    const { data: activeRoadmaps } = await supabase
      .from("roadmaps")
      .select("topic")
      .eq("user_id", userId);
    
    const activeTopics = (activeRoadmaps || []).map(r => r.topic);
    // Add the newly added skill just in case it's not saved to roadmaps table yet
    if (!activeTopics.includes(addedSkill)) {
      activeTopics.push(addedSkill);
    }

    // 4. Fetch the existing recommendations so we don't duplicate them
    const { data: currentRecs } = await supabase
      .from("user_skills")
      .select("title")
      .eq("user_id", userId)
      .eq("status", "Recommended");
    
    const existingRecs = (currentRecs || []).map(r => r.title);

    // 5. Call Gemini to generate 1 new recommended skill
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert career coach and technical recruiter.
      I have provided the candidate's Resume Data:
      ${resumeData}

      The candidate is officially ALREADY learning these skills: [${activeTopics.join(", ")}].
      The candidate ALSO already has these skills recommended to them: [${existingRecs.join(", ")}].

      The user just added the skill "${addedSkill}" to their learning roadmap, so we need ONE new skill recommendation to replace it in their suggestions queue.

      Recommend EXACTLY ONE new specific skill (technology, tool, or concept) they should learn next.
      Assign a size "sm", "md", or "lg" to it to represent its importance.
      
      Return ONLY a JSON object with this exact structure:
      {
        "title": "Skill Name",
        "size": "md"
      }
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    const newSkill = JSON.parse(responseText);

    if (newSkill && newSkill.title) {
      // 6. Insert the new skill into user_skills
      await supabase
        .from("user_skills")
        .insert({
          user_id: userId,
          title: newSkill.title,
          category: newSkill.size || "md",
          status: "Recommended",
          progress: 0,
          total_time_spent: 0,
          icon_name: "Sparkles"
        });
    }

    return NextResponse.json({ success: true, newSkill });

  } catch (error: any) {
    console.error("Replacement API Error:", error);
    return NextResponse.json({ error: error.message || "Replacement failed." }, { status: 500 });
  }
}
