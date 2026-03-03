import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Pre-defined scattered positions for the bubbles to prevent overlapping
const BUBBLE_POSITIONS = [
  { top: '20%', left: '20%', delay: 0 },
  { top: '45%', left: '80%', delay: 0.5 },
  { top: '75%', left: '30%', delay: 1 },
  { top: '50%', left: '50%', delay: 0.2 },
  { top: '80%', left: '70%', delay: 0.8 },
  { top: '25%', left: '75%', delay: 1.2 },
  { top: '15%', left: '50%', delay: 0.7 },
];

export async function POST(req: Request) {
  try {
    const { field, level, currentSkills } = await req.json();

    // Temporarily unhooking AI generation to save tokens / avoid rate limits.
    // Using mock data based on the typical payload.
    const mockSuggestions = [
      { text: "Docker", size: "md" },
      { text: "TypeScript", size: "lg" },
      { text: "GraphQL", size: "sm" },
      { text: "AWS", size: "md" },
      { text: "Next.js", size: "lg" },
      { text: "Kubernetes", size: "sm" }
    ];

    // Map the suggestions to our safe CSS positions
    const formattedBubbles = mockSuggestions.map((item: any, index: number) => ({
      id: `dyn-bubble-${index}`,
      text: item.text,
      size: item.size || 'md',
      top: BUBBLE_POSITIONS[index % BUBBLE_POSITIONS.length].top,
      left: BUBBLE_POSITIONS[index % BUBBLE_POSITIONS.length].left,
      delay: BUBBLE_POSITIONS[index % BUBBLE_POSITIONS.length].delay,
    }));

    return NextResponse.json(formattedBubbles);

  } catch (error: any) {
    console.error("Suggestions API Error:", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}