import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/utils/supabase/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user's active/completed skills
    console.log('Fetching skills for user:', user.id);
    const { data: skills, error: skillError } = await supabase
      .from('roadmaps')
      .select('topic')
      .eq('user_id', user.id)
      .limit(10);

    if (skillError) {
      console.error('Error fetching skills:', skillError);
    }

    const skillTitles = skills?.map(s => s.topic) || [];
    console.log('Skill list for fact generation:', skillTitles);
    
    if (skillTitles.length === 0) {
      skillTitles.push('Learning Science', 'Memory Retention', 'Active Recall');
    }

    // 2. Generate a fact based on these skills
    const modelName = 'gemini-2.5-flash'; 
    const prompt = `You are a learning science expert. Generate ONE interesting, very short "Did You Know?" fact related to one of these topics: ${skillTitles.join(', ')}.
    
    Rules:
    - Fact must be under 20 words.
    - Fact must be surprising or highly practical.
    - Choose a random topic from the list to keep it fresh.
    - Suggest a single relevant emoji.
    
    Return ONLY valid JSON:
    {
      "fact": "the fact text here",
      "emoji": "emoji here",
      "skill": "the specific skill this relates to"
    }`;

    console.log('Generating fact with model:', modelName);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    if (!response.text) {
      console.error('Empty response from AI for fact generation');
      throw new Error('No response from AI');
    }
    
    console.log('AI Fact Response:', response.text);
    const parsed = JSON.parse(response.text);

    // 3. Upsert to database
    console.log('Upserting fact to DB...');
    const { data: updated, error: upsertError } = await supabase
      .from('user_review_facts')
      .upsert({
        user_id: user.id,
        fact_text: parsed.fact,
        emoji: parsed.emoji,
        skill_title: parsed.skill,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (upsertError) {
       console.error('CRITICAL DATABASE ERROR (Did you run the migration?):', upsertError);
       // Return the parsed fact anyway if DB fails so the user can at least see the UI working
       return NextResponse.json({
         fact_text: parsed.fact,
         emoji: parsed.emoji,
         skill_title: parsed.skill,
       });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Fact generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
  
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const { data } = await supabase
        .from('user_review_facts')
        .select('*')
        .eq('user_id', user.id)
        .single();
  
      return NextResponse.json(data || { fact_text: null });
    } catch (err) {
      return NextResponse.json({ fact_text: null });
    }
}
