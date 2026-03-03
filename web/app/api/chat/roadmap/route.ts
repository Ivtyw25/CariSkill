import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getRoadmapPrompt, roadmapResponseSchema } from "./prompt";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

interface MessageRecord {
    role: 'user' | 'ai';
    content: string;
}

export async function POST(req: Request) {
    try {
        const { message, history = [], roadmap_context, current_roadmap } = await req.json();

        if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
        const recentHistory = (history as MessageRecord[]).slice(-10);
        const conversationHistory = recentHistory
            .map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content.substring(0, 300)}`)
            .join('\n');

        if (!roadmap_context) {
            return NextResponse.json({ error: "roadmap_context is required for roadmap Q&A" }, { status: 400 });
        }

        const systemPrompt = getRoadmapPrompt(roadmap_context, current_roadmap, conversationHistory, message);

        let lastError: any;
        for (const modelName of MODELS) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: systemPrompt,
                    config: {
                        responseMimeType: "application/json",
                        responseJsonSchema: zodToJsonSchema(roadmapResponseSchema as any) as any,
                    },
                });

                if (!response.text) {
                    throw new Error("No text returned from model");
                }

                const parsed = JSON.parse(response.text);
                const validated = roadmapResponseSchema.parse(parsed);

                return NextResponse.json({
                    response: {
                        reply: validated.reply || "I'm here to help!",
                        edit_roadmap: validated.edit_roadmap || false,
                        updated_roadmap: validated.updated_roadmap || null
                    }
                });
            } catch (e: any) {
                console.warn(`[Chat Roadmap API] Model ${modelName} failed: ${e.message}`);
                lastError = e;
            }
        }

        throw lastError;

    } catch (error: any) {
        console.error("[Chat Roadmap API] All models failed:", error?.message);
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }
}
