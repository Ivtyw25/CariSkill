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

    const { dbId, currentContent, feedback } = await req.json();

    if (!dbId || !currentContent || !feedback) {
      console.error("Missing fields! Received:", { dbId, currentContent, feedback });
      return NextResponse.json({ 
        error: `Missing required fields. dbId=${!!dbId}, currentContent=${!!currentContent}, feedback=${!!feedback}` 
      }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are an expert AI teaching assistant. The user has provided feedback on a specific learning topic because they found it difficult to understand. 
Your task is to rewrite the provided content to address their feedback, making it easier to understand, adding analogies or examples if requested, but maintaining the exact same markdown formatting and professional tone.
Output ONLY the rewritten content without any conversational filler or preambles.`,
    });

    const prompt = `Current Content:\n${currentContent}\n\nUser Feedback:\n${feedback}\n\nPlease rewrite the content to improve it based on the feedback:`;

    const result = await model.generateContent(prompt);
    const rewrittenText = result.response.text();

    if (!rewrittenText) {
      throw new Error("Failed to generate rewritten content.");
    }

    // Update the database
    // First, fetch the existing row to merge the jsonb content
    const { data: existingRow, error: fetchError } = await supabase
      .from('micro_topics_contents')
      .select('content')
      .eq('id', dbId)
      .single();

    if (fetchError || !existingRow) {
      throw new Error("Could not find the original topic in the database.");
    }

    const updatedContent = typeof existingRow.content === 'string' 
      ? JSON.parse(existingRow.content) 
      : existingRow.content;
      
    // Overwrite just the theory explanation
    updatedContent.theory_explanation = rewrittenText;

    const { error: updateError } = await supabase
      .from('micro_topics_contents')
      .update({ content: updatedContent })
      .eq('id', dbId);

    if (updateError) {
      throw new Error("Failed to save updated content to database.");
    }

    return NextResponse.json({ 
      message: "Topic updated successfully",
      updatedContent: rewrittenText 
    });

  } catch (error: any) {
    console.error("Improve Topic API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request." }, { status: 500 });
  }
}
