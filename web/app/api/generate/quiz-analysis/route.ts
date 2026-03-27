import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = ["gemini-2.5-flash"];

export async function POST(req: Request) {
  // Removed artificial delay to speed up demo

  try {
    const { questions, answers, topicTitle, moduleId, questionType } = await req.json();

    // Check if this is the demo node
    const lowerTitle = topicTitle?.toLowerCase() || "";
    const isDemoNode = lowerTitle.includes("business idea validation") || 
                       lowerTitle.includes("market research") ||
                       lowerTitle.includes("bakery") ||
                       moduleId === "01b0235e-c171-4237-b131-50a82554e23e" ||
                       moduleId === "business_idea_validation";
                       
    if (isDemoNode) {
      // Return pre-generated analysis for the demo
      return NextResponse.json({
        "strengths": "You show a clear understanding of the 'Defining your Niche' and 'SWOT Analysis' concepts, correctly identifying the internal vs external factors.",
        "weaknesses": "You struggled with the 'Primary Research' distinction in the multiple-choice section and did not provide responses for the open-ended questions.",
        "overallFeedback": "Great effort! You've grasped the core theoretical concepts, now reach out to real customers to validate those assumptions.",
        "subtopicsToRevise": [
          {
            "title": "Primary vs Secondary Research",
            "reason": "Differentiating these is crucial for cost-effective validation."
          },
          {
            "title": "Qualitative Data Collection",
            "reason": "The open-ended questions highlighted a need for more focus on focus groups and surveys."
          }
        ],
        "openEndedMarking": [
          {
            "questionIndex": 3,
            "isCorrect": false,
            "feedback": "Answer was missing. Focus groups are vital for qualitative depth."
          },
          {
            "questionIndex": 4,
            "isCorrect": false,
            "feedback": "No response provided. Understanding market saturation prevents entering over-crowded spaces."
          }
        ]
      });
    }

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
