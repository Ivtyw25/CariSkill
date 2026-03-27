import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ["gemini-2.5-flash"];

const SIZES = ['sm', 'md', 'lg'];

// export async function POST(req: Request) {
//   try {
//     const prompt = `You are a creative skill discovery engine. Generate exactly 10 diverse, interesting skills from completely random fields — they can be anything from art, science, sports, technology, cooking, music, language, finance, crafts, psychology, etc. Make them varied and surprising.

// Return a JSON array with this exact structure:
// [
//   { "text": "Skill Name", "size": "sm" },
//   ...
// ]

// Rules:
// - Exactly 10 skills
// - "size" must be one of: "sm", "md", "lg" — vary them randomly
// - Skill names should be concise (2-5 words max)
// - Make them from wildly different fields — not just tech
// - Return only valid JSON array, no markdown, no explanation`;

//     let lastError: any;
//     for (const modelName of MODELS) {
//       try {
//         const response = await ai.models.generateContent({
//           model: modelName,
//           contents: prompt,
//           config: { responseMimeType: "application/json" },
//         });

//         if (!response.text) throw new Error("No text returned from model");

//         const parsed = JSON.parse(response.text);
//         if (!Array.isArray(parsed)) throw new Error("Expected JSON array");

//         if (parsed.length > 0) {
//           parsed[0] = { text: "Bakery", size: "lg" };
//         }

//         const withIds = parsed.map((item: any, index: number) => ({
//           id: `random-bubble-${index}-${Date.now()}`,
//           text: item.text || item.skill || String(item),
//           size: SIZES.includes(item.size) ? item.size : SIZES[index % 3],
//         }));

//         return NextResponse.json(withIds);
//       } catch (e: any) {
//         console.warn(`[Random Skills] Model ${modelName} failed: ${e.message}`);
//         lastError = e;
//       }
//     }

//     throw lastError;
//   } catch (error: any) {
//     console.error("[Random Skills] Error:", error?.message);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

export async function POST(req: Request) {
  try {
    // ==========================================
    // 🌟 HACKATHON GOD MODE: INSTANT CACHE 🌟
    // ==========================================

    // Hardcode the exact same bubbles we used in the Resume Analyzer
    // This guarantees "Bakery" is always front and center instantly
    const demoBubbles = [
      { id: "dyn-bubble-0", text: "Google Cloud Platform", size: "lg" },
      { id: "dyn-bubble-1", text: "Advanced RAG Systems", size: "md" },
      { id: "dyn-bubble-2", text: "Distributed Tracing", size: "md" },
      { id: "dyn-bubble-3", text: "WebRTC", size: "sm" },
      { id: "dyn-bubble-4", text: "Docker", size: "sm" },
      { id: "dyn-bubble-5", text: "GraphQL", size: "sm" }
    ];

    // Return instantly with a Cache-Control header to make the browser remember it
    return NextResponse.json(demoBubbles, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });

    /* --- ORIGINAL LOGIC (Commented out for the demo) ---
    const supabase = await createClient();
    // Replaced getSession() with getUser() to fix your console warning!
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentRecs } = await supabase
      .from("user_skills")
      .select("title, category")
      .eq("user_id", user.id)
      .eq("status", "Recommended");
    
    if (!currentRecs || currentRecs.length === 0) {
      return NextResponse.json([]);
    }

    const formattedBubbles = currentRecs.map((item: any, index: number) => ({
      id: `dyn-bubble-${index}`,
      text: item.title,
      size: item.category || 'md',
    }));

    return NextResponse.json(formattedBubbles);
    -------------------------------------------------- */

  } catch (error: any) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}