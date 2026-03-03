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
            .select("quiz_data")
            .eq("id", microTopicId)
            .single();

        if (existing?.quiz_data) {
            return NextResponse.json({ quiz: existing.quiz_data, cached: true });
        }

        const prompt = `You are a quiz generator for a learning platform. Generate exactly 5 multiple-choice questions for the topic: "${topicTitle}".

Context from study material:
${(theoryExplanation || "").slice(0, 1500)}

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "id": "1",
      "question": "A clear, unambiguous question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "hint": "A subtle directional clue without giving away the answer",
      "explanation": "A 1-2 sentence explanation of why the correct answer is right"
    }
  ]
}

Rules:
- Exactly 5 questions
- Each question has exactly 4 options
- correctAnswerIndex is 0-based (0, 1, 2, or 3)
- Vary the correct answer position across questions
- hint: max 20 words, should guide without revealing
- explanation: max 40 words, educational tone
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
                if (!parsed.questions || !Array.isArray(parsed.questions)) {
                    throw new Error("Invalid quiz structure returned");
                }

                // Save to DB for future visits
                const { error: saveError } = await supabase
                    .from("micro_topics_contents")
                    .update({ quiz_data: parsed })
                    .eq("id", microTopicId);

                if (saveError) {
                    console.error(`[Generate Quiz] DB save error:`, saveError.message);
                }

                return NextResponse.json({ quiz: parsed, cached: false });
            } catch (e: any) {
                console.warn(`[Generate Quiz] Model ${modelName} failed: ${e.message}`);
                lastError = e;
            }
        }

        throw lastError;
    } catch (error: any) {
        console.error("[Generate Quiz] Error:", error?.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
