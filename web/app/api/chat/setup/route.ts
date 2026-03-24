import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { zodToJsonSchema } from "zod-to-json-schema";
import { setupSystemInstruction, setupResponseSchema } from "./prompt";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-2.5-flash";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

interface MessageRecord {
    role: 'user' | 'ai';
    content: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

        let lastError: any;
        for (let i = 0; i <= MAX_RETRIES; i++) {
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
                lastError = e;
                const isRateLimit = e.message?.includes("429") || e.status === 429 || e.code === 429;
                
                if (isRateLimit && i < MAX_RETRIES) {
                    const backoff = INITIAL_BACKOFF_MS * Math.pow(2, i);
                    console.warn(`[Chat Setup API] Rate limited (429). Retrying in ${backoff}ms... (Attempt ${i + 1}/${MAX_RETRIES})`);
                    await sleep(backoff);
                    continue;
                }
                
                console.error(`[Chat Setup API] Model ${MODEL_NAME} failed: ${e.message}`);
                break; // Break loop if not a rate limit error or max retries reached
            }
        }

        return NextResponse.json(
            { status: "error", message: lastError.message || "Failed after retries" },
            { status: lastError.status === 429 ? 429 : 500 }
        );

    } catch (error: any) {
        console.error("[Chat Setup API] Request error:", error?.message);
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }
}
