import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ["gemini-2.0-flash", "gemini-2.5-flash"];

const SIZES = ['sm', 'md', 'lg'];

export async function POST(req: Request) {
  try {
    const prompt = `You are a creative skill discovery engine. Generate exactly 10 diverse, interesting skills from completely random fields — they can be anything from art, science, sports, technology, cooking, music, language, finance, crafts, psychology, etc. Make them varied and surprising.

Return a JSON array with this exact structure:
[
  { "text": "Skill Name", "size": "sm" },
  ...
]

Rules:
- Exactly 10 skills
- "size" must be one of: "sm", "md", "lg" — vary them randomly
- Skill names should be concise (2-5 words max)
- Make them from wildly different fields — not just tech
- Return only valid JSON array, no markdown, no explanation`;

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
        if (!Array.isArray(parsed)) throw new Error("Expected JSON array");

        const withIds = parsed.map((item: any, index: number) => ({
          id: `random-bubble-${index}-${Date.now()}`,
          text: item.text || item.skill || String(item),
          size: SIZES.includes(item.size) ? item.size : SIZES[index % 3],
        }));

        return NextResponse.json(withIds);
      } catch (e: any) {
        console.warn(`[Random Skills] Model ${modelName} failed: ${e.message}`);
        lastError = e;
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error("[Random Skills] Error:", error?.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
