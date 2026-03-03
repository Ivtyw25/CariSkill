import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

export async function POST(req: Request) {
    try {
        const { microTopicId, topicTitle, theoryExplanation } = await req.json();

        if (!microTopicId || !topicTitle) {
            return NextResponse.json({ error: "microTopicId and topicTitle are required" }, { status: 400 });
        }

        // Check if already generated (cache hit)
        const supabase = createAdminClient();
        const { data: existing } = await supabase
            .from("micro_topics_contents")
            .select("flashcards_data")
            .eq("id", microTopicId)
            .single();

        if (existing?.flashcards_data) {
            return NextResponse.json({ flashcards: existing.flashcards_data, cached: true });
        }

        const prompt = `You are a flashcard generator for a learning platform. Generate exactly 6 concise flashcard objects for the topic: "${topicTitle}".

Context from study material:
${(theoryExplanation || "").slice(0, 1500)}

Return a JSON object with this exact structure:
{
  "cards": [
    {
      "id": "1",
      "front": "A clear, focused question or concept prompt",
      "back": ["Key answer point 1", "Key answer point 2", "Key answer point 3"],
      "tag": "One short category label (e.g. Concept, Syntax, Example, Definition)"
    }
  ]
}

Rules:
- Exactly 6 cards
- front: short, 1-sentence question
- back: 2-4 bullet points, each max 20 words
- tag: one of [Concept, Syntax, Example, Definition, Theory, Practice]
- Return only valid JSON, no markdown`;

        let lastError: any;
        for (const modelName of MODELS) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: { responseMimeType: "application/json" },
                });

                if (!response.text) throw new Error("No text returned from model");

                const parsed = JSON.parse(response.text);
                if (!parsed.cards || !Array.isArray(parsed.cards)) {
                    throw new Error("Invalid flashcard structure returned");
                }

                // Save to DB for future visits
                const { error: saveError } = await supabase
                    .from("micro_topics_contents")
                    .update({ flashcards_data: parsed })
                    .eq("id", microTopicId);

                if (saveError) {
                    console.error(`[Generate Flashcards] DB save error:`, saveError.message);
                }

                return NextResponse.json({ flashcards: parsed, cached: false });
            } catch (e: any) {
                console.warn(`[Generate Flashcards] Model ${modelName} failed: ${e.message}`);
                lastError = e;
            }
        }

        throw lastError;
    } catch (error: any) {
        console.error("[Generate Flashcards] Error:", error?.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
