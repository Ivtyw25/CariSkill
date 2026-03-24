import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Fetch all published roadmaps
    const { data: roadmaps, error } = await supabase
      .from("community_roadmaps")
      .select("id, title, description, category");

    if (error || !roadmaps || roadmaps.length === 0) {
      return NextResponse.json({ ids: [] });
    }

    const roadmapsPayload = roadmaps.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category
    }));

    const prompt = `
You are a smart semantic search engine for an educational platform 'CariSkill'.
The user searched for: "${query}"

Here is the list of available community learning paths (skills):
${JSON.stringify(roadmapsPayload)}

Task:
Find all the skills that are semantically relevant to the user's search query. For example, if the user searches for "website framework", you should include skills like "Angular", "React", "Vue", "Next.js", etc. even if the word "framework" is not directly in the title or description, because conceptually they are strongly related.
Also perform standard substring and topic matching.

Return your response strictly as a valid JSON array of strings containing the 'id's of the relevant skills.
For example: ["uuid-1", "uuid-2"]

Do not return any markdown code blocks, explanation or surrounding text. Only the raw JSON array.
If no skills match, return an empty array: []
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text || "[]";
    
    // Strip markdown code blocks just in case
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('\`\`\`json')) {
      cleanedText = cleanedText.replace(/^\`\`\`json/m, '').replace(/\`\`\`$/m, '').trim();
    } else if (cleanedText.startsWith('\`\`\`')) {
       cleanedText = cleanedText.replace(/^\`\`\`/m, '').replace(/\`\`\`$/m, '').trim();
    }
    
    const result = JSON.parse(cleanedText);

    return NextResponse.json({ ids: Array.isArray(result) ? result : [] });
  } catch (error) {
    console.error("Semantic Search API Error:", error);
    return NextResponse.json({ error: "Failed to perform semantic search" }, { status: 500 });
  }
}
