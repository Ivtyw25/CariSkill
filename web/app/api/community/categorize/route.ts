import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Fetch existing categories to help Gemini output a consistent mapping.
    const { data: catData, error } = await supabase
      .from("community_roadmaps")
      .select("category")
      .order("created_at", { ascending: false })
      .limit(200);

    let existingCategories: string[] = [];
    if (catData) {
      existingCategories = Array.from(new Set(catData.map(c => c.category).filter(c => c && c !== "Uncategorized")));
    }

    const prompt = `
You are an intelligent knowledge librarian categorizing community roadmaps for an educational platform 'CariSkill'.

We have a new roadmap titled: "${title}"
Description: "${description}"

Currently, the known categories in our system are: ${existingCategories.length > 0 ? existingCategories.join(", ") : "None yet"}.

Task:
1. Determine if this roadmap neatly fits into one of the known categories. If it does, strictly use that exact category name.
2. If it represents a distinct domain not covered by the existing tags (e.g. it is about DevOps and we only have 'Frontend'), create a NEW broad, concise category name (1-3 words) like "Web Development", "Cybersecurity", "DevOps", or "Machine Learning".
3. Select an appropriate icon identifier for this roadmap strictly from this list: 'database', 'list', 'trending-up', 'code', 'book-open', 'cpu', 'globe', 'layers', 'shield', 'smartphone', 'monitor', 'terminal', 'cloud', 'briefcase'.

Return your response strictly as a valid JSON object matching this TypeScript interface exactly:
{
  "category": string, // The assigned category name
  "icon": string      // The selected icon identifier
}
Do not return any markdown code blocks or surrounding text. Only the raw JSON object.
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text || "{}";
    
    // Strip markdown code blocks just in case
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('\`\`\`json')) {
      cleanedText = cleanedText.replace(/^\`\`\`json/m, '').replace(/\`\`\`$/m, '').trim();
    } else if (cleanedText.startsWith('\`\`\`')) {
       cleanedText = cleanedText.replace(/^\`\`\`/m, '').replace(/\`\`\`$/m, '').trim();
    }
    
    const result = JSON.parse(cleanedText);

    return NextResponse.json({ category: result.category || "Uncategorized", icon_type: result.icon || "book-open" });
  } catch (error) {
    console.error("Categorization API Error:", error);
    return NextResponse.json({ error: "Failed to categorize roadmap" }, { status: 500 });
  }
}
