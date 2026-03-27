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

    // DEMO OVERRIDE: If user types "add example" for the bakery niche topic, use the pre-generated polished version
    const isDemoNode = dbId === '01b0235e-c171-4237-b131-50a82554e23e';
    const isAddExample = feedback.toLowerCase().includes('add example');

    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'dummy_key_for_demo'; // handle missing env if needed

    let rewrittenText = "";
    let finalContentObj: any = null;

    if (isDemoNode && isAddExample) {
      // Load the pre-generated V2 version
      const fs = require('fs');
      const path = require('path');
      const v2Path = path.join(process.cwd(), 'demo_material_v2.json');
      if (fs.existsSync(v2Path)) {
        const v2Data = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
        rewrittenText = v2Data.theory_explanation;
        finalContentObj = v2Data;
      }
    }

    if (!rewrittenText) {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `You are an expert AI teaching assistant. The user has provided feedback on a specific learning topic because they found it difficult to understand. 
Your task is to rewrite the provided content to address their feedback, making it easier to understand, adding analogies or examples if requested, but maintaining the exact same markdown formatting and professional tone.
Output ONLY the rewritten content without any conversational filler or preambles.`,
      });

      const prompt = `Current Content:\n${currentContent}\n\nUser Feedback:\n${feedback}\n\nPlease rewrite the content to improve it based on the feedback:`;

      const result = await model.generateContent(prompt);
      rewrittenText = result.response.text();

      if (!rewrittenText) {
        throw new Error("Failed to generate rewritten content.");
      }
    }

    // Update the database
    let contentToSave: any = null;

    if (finalContentObj) {
        contentToSave = finalContentObj;
    } else {
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
        contentToSave = updatedContent;
    }

    const { error: updateError } = await supabase
      .from('micro_topics_contents')
      .update({ content: contentToSave })
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
