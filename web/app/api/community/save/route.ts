import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const { roadmap_id } = await req.json();

    if (!roadmap_id) {
       return NextResponse.json({ error: "Missing roadmap_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    
    // Ensure the roadmap is actually published 
    const { data: isPublished } = await adminClient
        .from('community_roadmaps')
        .select('id')
        .eq('roadmap_id', roadmap_id)
        .limit(1);
        
    if (!isPublished || isPublished.length === 0) {
        return NextResponse.json({ error: "Original roadmap not found or not public" }, { status: 404 });
    }
    
    // Check if trying to save own roadmap
    const { data: origRoadmap } = await adminClient
      .from('roadmaps')
      .select('user_id')
      .eq('id', roadmap_id)
      .single();

    if (origRoadmap && origRoadmap.user_id === user.id) {
        // Just return success if they already own it implicitly
        return NextResponse.json({ success: true, roadmap_id });
    }

    // Insert saved roadmap for current user using admin client
    const { error: insertErr } = await adminClient
      .from('saved_roadmaps')
      .insert({ 
          user_id: user.id,
          roadmap_id: roadmap_id
      });

    // Code 23505 is unique_violation, meaning they already saved it
    if (insertErr && insertErr.code !== '23505') {
        console.error("Save logic error:", insertErr);
        return NextResponse.json({ error: "Failed to save roadmap" }, { status: 500 });
    }

    return NextResponse.json({ success: true, roadmap_id });
  } catch (err) {
    console.error("Failed to save roadmap:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
