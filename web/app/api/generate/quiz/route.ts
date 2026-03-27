import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ["gemini-2.5-flash"];

export async function POST(req: Request) {
  try {
    const {
      microTopicId,       // kept for caching (single-topic legacy)
      topicTitle,         // primary topic title / module title
      theoryExplanation,  // combined theory content
      questionType = 'multiple-choice',
      numQuestions = 10,
    } = await req.json();

    if (!topicTitle) {
      return NextResponse.json({ error: "topicTitle is required" }, { status: 400 });
    }

    // Check cache for multiple-choice single-topic (legacy)
    const supabase = createAdminClient();
    if (microTopicId && questionType === 'multiple-choice' && numQuestions === 10) {
      const { data: existing } = await supabase
        .from("micro_topics_contents")
        .select("quiz_data")
        .eq("id", microTopicId)
        .single();

      if (existing && existing.quiz_data?.questions?.length === numQuestions) {
        return NextResponse.json({ quiz: existing.quiz_data, cached: true });
      }
    }

    const n = Math.min(Math.max(numQuestions, 1), 20);
    const theorySnippet = (theoryExplanation || "").slice(0, 3000);

    let prompt = "";

    if (questionType === 'multiple-choice') {
      prompt = `You are a quiz generator. Generate exactly ${n} multiple-choice questions for the topic: "${topicTitle}".
      
Study material context:
${theorySnippet}

Return a JSON object:
{
  "questions": [
    {
      "id": "1",
      "type": "multiple-choice",
      "question": "Clear, unambiguous question",
      "options": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0,
      "hint": "Subtle clue (max 20 words)",
      "explanation": "Why correct answer is right (max 40 words)",
      "sourceMaterial": "Title of the subtopic this is from (max 5 words)"
    }
  ]
}

Rules:
- Exactly ${n} questions, 4 options each
- correctAnswerIndex is 0-based
- sourceMaterial: Identify the specific concept or subtopic name from the context
- Return only valid JSON, no markdown`;
    } else if (questionType === 'open-ended') {
      prompt = `You are a quiz generator. Generate exactly ${n} open-ended questions for: "${topicTitle}".

Study material context:
${theorySnippet}

Return a JSON object:
{
  "questions": [
    {
      "id": "1",
      "type": "open-ended",
      "question": "Thought-provoking question",
      "modelAnswer": "Comprehensive model answer (2-4 sentences)",
      "hint": "Subtle clue (max 20 words)",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "sourceMaterial": "Title of the subtopic this is from (max 5 words)"
    }
  ]
}

Rules:
- Exactly ${n} questions
- keyPoints: 2-4 points
- sourceMaterial: Identify the specific concept or subtopic name from the context
- Return only valid JSON, no markdown`;
    } else {
      // mixed: roughly half/half
      const mcqCount = Math.ceil(n / 2);
      const oeCount = n - mcqCount;
      prompt = `You are a quiz generator. Generate exactly ${n} questions (${mcqCount} multiple-choice + ${oeCount} open-ended) for: "${topicTitle}".

Study material context:
${theorySnippet}

Return a JSON object:
{
  "questions": [
    {
      "id": "1",
      "type": "multiple-choice",
      "question": "MCQ question",
      "options": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0,
      "hint": "Hint (max 20 words)",
      "explanation": "Explanation (max 40 words)",
      "sourceMaterial": "Subtopic title"
    },
    {
      "id": "${mcqCount + 1}",
      "type": "open-ended",
      "question": "Open-ended question",
      "modelAnswer": "Model answer (2-4 sentences)",
      "hint": "Hint (max 20 words)",
      "keyPoints": ["Key point 1", "Key point 2"],
      "sourceMaterial": "Subtopic title"
    }
  ]
}

Rules:
- Exactly ${mcqCount} MCQ then ${oeCount} open-ended
- MCQ: 4 options, 0-based correctAnswerIndex
- sourceMaterial: Identify the subtopic title for every question
- Return only valid JSON, no markdown`;
    }

    let lastError: any;
    for (const modelName of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (!response.text) throw new Error("No text returned");
        const parsed = JSON.parse(response.text);
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          throw new Error("Invalid quiz structure");
        }

        // Cache only for single-topic multiple-choice 10-question case
        if (microTopicId && questionType === 'multiple-choice' && n === 10) {
          await supabase
            .from("micro_topics_contents")
            .update({ quiz_data: parsed })
            .eq("id", microTopicId);
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
