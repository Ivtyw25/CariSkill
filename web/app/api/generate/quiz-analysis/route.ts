import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

export async function POST(req: Request) {
  try {
    const { questions, answers, topicTitle, moduleId, questionType } = await req.json();

    if (!questions || !answers || !topicTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build answered questions summary
    const answeredSummary = questions.map((q: any, i: number) => {
      if (q.type === 'open-ended') {
        return `Q${i + 1} (Open-ended): ${q.question}\nStudent's answer: ${answers[i] || "(no answer)"}\nModel answer: ${q.modelAnswer}\nKey points: ${(q.keyPoints || []).join(", ")}`;
      } else {
        const selected = answers[i] !== undefined ? q.options?.[answers[i]] : "(not answered)";
        const correct = q.options?.[q.correctAnswerIndex];
        const isCorrect = answers[i] === q.correctAnswerIndex;
        return `Q${i + 1} (MCQ): ${q.question}\nStudent answered: ${selected} (${isCorrect ? "CORRECT" : "WRONG"})\nCorrect: ${correct}`;
      }
    }).join("\n\n");

    const prompt = `You are an educational evaluator and performance analyst. A student just completed a quiz on "${topicTitle}".
    The quiz contains both multiple-choice and open-ended questions.
    
    IMPORTANT: For OPEN-ENDED questions, you must evaluate the student's answer against the "Model Answer" and "Key Points".
    Mark an open-ended answer as "isCorrect": true if it covers at least 50% of the intended key points or demonstrates a clear, accurate understanding of the core concept.
    Note: The student may answer in any language (English, Malay, Mandarin, etc.) — evaluate the meaning, not just the exact wording.

    Here is the student's performance data:
    ${answeredSummary}
    
    Analyze their performance and return a JSON object with this exact structure:
    {
      "strengths": "2-3 sentences describing what the student clearly understands well",
      "weaknesses": "2-3 sentences describing concepts the student needs to work on",
      "overallFeedback": "1 encouraging sentence summarizing their performance",
      "subtopicsToRevise": [
        {
          "title": "Specific concept/subtopic name to revise",
          "reason": "Why they need to revise this (1 sentence)"
        }
      ],
      "openEndedMarking": [
        {
          "questionIndex": 0,
          "isCorrect": true,
          "feedback": "Short comment on why it was marked correct/incorrect (15 words max)"
        }
      ]
    }
    
    Rules:
    - total questions = ${questions.length}
    - openEndedMarking should contain an entry for EVERY open-ended question in the quiz.
    - Be specific and educational in your feedback
    - strengths and weaknesses should be based on the actual answers given
    - subtopicsToRevise: maximum 3 items
    - Return only valid JSON, no markdown`;

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
        return NextResponse.json(parsed);
      } catch (e: any) {
        console.warn(`[Quiz Analysis] Model ${modelName} failed: ${e.message}`);
        lastError = e;
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error("[Quiz Analysis] Error:", error?.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
