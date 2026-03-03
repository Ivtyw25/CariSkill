import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { zodToJsonSchema } from "zod-to-json-schema";
import { setupSystemInstruction, setupResponseSchema } from "./prompt";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";
interface MessageRecord {
    role: 'user' | 'ai';
    content: string;
}

export async function POST(req: Request) {
    try {
        const { message, history = [] } = await req.json();

        if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
        const recentHistory = (history as MessageRecord[]).slice(-10);

        const contents = [
            ...recentHistory.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            })),
            { role: 'user', parts: [{ text: message }] }
        ];

        try {
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: contents as any,
                config: {
                    systemInstruction: setupSystemInstruction,
                    responseMimeType: "application/json",
                    responseJsonSchema: zodToJsonSchema(setupResponseSchema as any),
                },
            });

            if (!response.text) {
                throw new Error("No text returned from model");
            }

            console.log("[Chat Setup API] Raw GenerateContent Output:\n", response.text);

            // Since we enforce structured output, model will respond in JSON matching our schema
            const parsed = JSON.parse(response.text);
            const validated = setupResponseSchema.parse(parsed);

            return NextResponse.json({
                response: {
                    reply: validated.reply,
                    ready_to_generate: validated.ready_to_generate,
                    topic: validated.topic,
                    experience: validated.experience,
                    goal: validated.goal,
                    constraints: validated.constraints
                }
            });
        } catch (e: any) {
            console.error(`[Chat Setup API] Model ${MODEL_NAME} failed: ${e.message}`);
            return NextResponse.json(
                { status: "error", message: e.message },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("[Chat Setup API] All models failed:", error?.message);
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }
}
