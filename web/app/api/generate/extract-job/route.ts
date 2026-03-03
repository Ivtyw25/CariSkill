import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Only PDF, JPG, PNG, and WebP files are supported" }, { status: 400 });
        }
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        // For PDFs, we use Gemini's inline data with application/pdf mime type
        // For images, we use inline image data
        const mimeType = file.type as any;

        const prompt = `You are analyzing a job advertisement. Extract the following information from this document and return ONLY a valid JSON object with no markdown:

{
  "job_title": "exact job title from the ad",
  "company": "company name (or null if not found)",
  "required_skills": ["skill1", "skill2", "skill3"],
  "raw_extracted_text": "first 500 characters of the main text content"
}

Rules:
- required_skills: include ALL technical skills (languages, frameworks, tools) AND important soft skills mentioned
- Each skill should be a short phrase, max 4 words
- Extract 5-20 skills depending on what's in the ad
- Return only the JSON object, no explanation`;

        let lastError: any;
        for (const modelName of ["gemini-2.5-flash"]) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: [{
                        role: 'user',
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64Data,
                                }
                            }
                        ]
                    }],
                    config: { responseMimeType: "application/json" },
                });

                if (!response.text) throw new Error("No response from model");

                const parsed = JSON.parse(response.text);
                if (!parsed.job_title || !Array.isArray(parsed.required_skills)) {
                    throw new Error("Invalid extraction structure");
                }

                // Save to Supabase
                const { data: savedJob, error: saveError } = await supabase
                    .from('target_jobs')
                    .insert({
                        user_id: user.id,
                        job_title: parsed.job_title,
                        company: parsed.company || null,
                        required_skills: parsed.required_skills,
                        raw_extracted_text: parsed.raw_extracted_text || null,
                    })
                    .select()
                    .single();

                if (saveError) {
                    console.error("[Extract Job] DB save error:", saveError.message);
                    throw new Error(`Failed to save job to database: ${saveError.message}`);
                }

                return NextResponse.json({ job: savedJob });

            } catch (e: any) {
                console.warn(`[Extract Job] Model ${modelName} failed: ${e.message}`);
                lastError = e;
            }
        }

        throw lastError;

    } catch (error: any) {
        console.error("[Extract Job] Error:", error?.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
