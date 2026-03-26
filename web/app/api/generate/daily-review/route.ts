import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { modules } = await req.json();

    if (!modules || modules.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    console.log('Daily Review Request for modules:', modules.length);
    
    // Use gemini-2.5-flash as it's more reliable in this environment
    const modelName = 'gemini-2.5-flash';

    // Generate 1-2 MCQ per module
    const prompt = `You are a quiz game engine. For each module listed below, generate exactly 1 short, factual multiple-choice question.

Rules:
- Questions must be VERY short (under 15 words) 
- 4 answer options (A-D), each under 8 words
- correctIndex is 0-based (0=A, 1=B, 2=C, 3=D)
- Make questions fun and interesting, not dry
- Focus on key concepts, not trivial details
- Return ONLY valid JSON

Modules to generate questions for:
${modules.map((m: any, i: number) => `${i + 1}. Skill: "${m.skillTitle}" | Module: "${m.nodeTitle}"`).join('\n')}

Return this exact JSON structure:
{
  "questions": [
    {
      "nodeId": "<the nodeId from module list>",
      "roadmapId": "<the roadmapId from module list>",
      "nodeTitle": "<module name>",
      "skillTitle": "<skill name>",
      "question": "<short question>",
      "options": ["A option", "B option", "C option", "D option"],
      "correctIndex": 0
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    if (!response.text) {
      console.error('No text returned from Gemini');
      throw new Error('No text returned from AI');
    }
    
    const text = response.text;
    console.log('Gemini Daily Review Response:', text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON:', parseError);
      // Fallback: try to extract JSON with regex if the mime type failed to return pure JSON
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonString = text.substring(jsonStart, jsonEnd);
        try {
          parsed = JSON.parse(jsonString);
        } catch (_) {
          throw new Error('Invalid JSON format from AI');
        }
      } else {
        throw new Error('Invalid JSON format from AI');
      }
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      console.error('Parsed result does not contain questions array', parsed);
      throw new Error('Malformed quiz data');
    }

    // Ensure nodeId/roadmapId are correctly mapped from the input
    const questionsWithIds = parsed.questions.map((q: any, i: number) => {
      // Find matching module by title if possible, else use index
      const sourceModule = modules[i] || modules[0]; 
      return {
        ...q,
        nodeId: sourceModule?.nodeId || q.nodeId,
        roadmapId: sourceModule?.roadmapId || q.roadmapId,
        nodeTitle: sourceModule?.nodeTitle || q.nodeTitle,
        skillTitle: sourceModule?.skillTitle || q.skillTitle,
      };
    });

    console.log('Successfully generated', questionsWithIds.length, 'questions');
    return NextResponse.json({ questions: questionsWithIds });
  } catch (error: any) {
    console.error('CRITICAL: Daily review generation error:', error.message);
    if (error.stack) console.error(error.stack);
    return NextResponse.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
  }
}
