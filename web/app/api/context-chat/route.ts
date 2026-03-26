import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, contextText, preferredLanguage = 'en' } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
    }

    if (!contextText) {
      return NextResponse.json({ error: "Context text is required." }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are an expert reading assistant. A user is reading the following study material:\n\n---\n${contextText}\n---\n\nAnswer the user's questions specifically using the provided material as context. Explain concepts clearly and concisely.\n\nIMPORTANT: The user prefers to communicate in language code: ${preferredLanguage}. You MUST read the English database context but natively comprehend and respond strictly in ${preferredLanguage}.`,
    });

    // Format all messages except the very last one as conversation history
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
    
    // The very last message is the current prompt
    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
        history,
    });

    const result = await chat.sendMessage(lastMessage);
    const replyText = result.response.text();

    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    console.error("Context Chat API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate reply." }, { status: 500 });
  }
}
