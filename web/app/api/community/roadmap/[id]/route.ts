import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
       return NextResponse.json({ error: "Invalid Roadmap ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    
    // Ensure the roadmap is actually published before returning its content
    const { data: isPublished } = await adminClient
        .from('community_roadmaps')
        .select('id')
        .eq('roadmap_id', id)
        .limit(1);
        
    if (!isPublished || isPublished.length === 0) {
        return NextResponse.json({ error: "Roadmap not found or not public" }, { status: 404 });
    }
    
    const { data, error } = await adminClient
      .from('roadmaps')
      .select('id, topic, content, user_id, time')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to fetch public roadmap:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
