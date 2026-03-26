import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const translationSchema = z.object({
  translations: z.array(z.string()).describe("The array of translated strings in identical order to the input")
});

function generateHash(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { text, targetLanguage } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Missing text or targetLanguage' }, { status: 400 });
    }

    if (targetLanguage === 'en') {
      return NextResponse.json({ translatedText: text });
    }

    const isInputArray = Array.isArray(text);
    const textArray = isInputArray ? text : [text];
    const textContext = isInputArray ? JSON.stringify(text) : text;
    const textHash = generateHash(textContext);

    // 1. Check Global Supabase Cache
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data: cachedData, error: cacheError } = await supabaseAdmin
          .from('app_translations_cache')
          .select('translated_text')
          .eq('text_hash', textHash)
          .eq('lang', targetLanguage)
          .maybeSingle();

        if (cachedData && cachedData.translated_text) {
          const parsedTrans = JSON.parse(cachedData.translated_text);
          return NextResponse.json({ 
            translatedText: isInputArray ? parsedTrans : (parsedTrans[0] || parsedTrans) 
          });
        }
      } catch (cacheErr) {
        console.error("Cache Check Error:", cacheErr);
      }
    }

    // 2. Cache Miss -> Check Gemini Key
    if (!process.env.GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY found, using mock translation.");
      await new Promise((resolve) => setTimeout(resolve, 300));
      const prefix = `[${targetLanguage.toUpperCase()}] `;
      if (Array.isArray(text)) {
          return NextResponse.json({ translatedText: text.map(t => prefix + t) });
      }
      return NextResponse.json({ translatedText: prefix + text });
    }

    // 3. Process with Gemini
    const prompt = `You are a professional software localization engine. Translate the provided array of strings into the language code: ${targetLanguage}.
CRITICAL RULES:
1. Maintain exact HTML, formatting, and markdown syntax. Do not strip out HTML tags or markdown symbols.
2. Provide a direct, literal translation for educational content.
3. You MUST output an array of identical length (${textArray.length}) in the exact same sequence.

INPUT (Translate these ${textArray.length} strings to ${targetLanguage}):
${JSON.stringify(textArray)}`;

    const safeSchema = {
      type: "object",
      properties: {
          translations: {
              type: "array",
              items: { type: "string" },
              description: "The array of translated strings in identical order to the input"
          }
      },
      required: ["translations"]
    };

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: safeSchema as any,
        },
    });

    if (!response.text) {
        throw new Error("Gemini returned no content");
    }

    let parsed;
    try {
        parsed = JSON.parse(response.text);
    } catch (pe) {
        throw new Error("Invalid JSON returned from model");
    }

    const validated = translationSchema.parse(parsed);

    // 4. Save the successful result to Supabase Cache
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin.from('app_translations_cache').upsert({
        text_hash: textHash,
        lang: targetLanguage,
        original_text: textContext,
        translated_text: JSON.stringify(validated.translations)
      }, { onConflict: 'text_hash, lang' }).then(({ error }) => {
        if (error) console.error("Cache Insertion Error:", error.message);
      });
    }

    // 5. Return to Client
    if (isInputArray) {
      return NextResponse.json({ translatedText: validated.translations });
    } else {
      return NextResponse.json({ translatedText: validated.translations[0] || text });
    }

  } catch (err: any) {
    console.error('Translation Route Error:', err);
    return NextResponse.json({ 
      error: 'Translation API Route Error', 
      message: err.message
    }, { status: 500 });
  }
}
