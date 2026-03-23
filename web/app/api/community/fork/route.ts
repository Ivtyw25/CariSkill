import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { original_id } = await req.json();

    if (!original_id) {
       return NextResponse.json({ error: "Missing original_id" }, { status: 400 });
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
        .eq('roadmap_id', original_id)
        .limit(1);
        
    if (!isPublished || isPublished.length === 0) {
        return NextResponse.json({ error: "Original roadmap not found or not public" }, { status: 404 });
    }
    
    // 1. Fetch original roadmap
    const { data: origRoadmap, error: roadmapErr } = await adminClient
      .from('roadmaps')
      .select('*')
      .eq('id', original_id)
      .single();

    if (roadmapErr || !origRoadmap) {
      return NextResponse.json({ error: "Original roadmap data missing" }, { status: 404 });
    }

    // Verify if trying to fork own roadmap - just return original if so
    if (origRoadmap.user_id === user.id) {
        return NextResponse.json({ newId: original_id });
    }

    // Prepare new UUID for the clone
    const newRoadmapId = crypto.randomUUID();

    // 2. Insert cloned roadmap for current user
    const { error: insertRoadmapErr } = await adminClient
      .from('roadmaps')
      .insert({
          id: newRoadmapId,
          user_id: user.id,
          topic: origRoadmap.topic,
          content: origRoadmap.content,
          time: origRoadmap.time
      });

    if (insertRoadmapErr) {
        console.error("Fork logic - insert roadmaps error:", insertRoadmapErr);
        return NextResponse.json({ error: "Failed to fork roadmap" }, { status: 500 });
    }

    // 3. Clone roadmap_nodes
    const { data: origNodes } = await adminClient.from('roadmap_nodes').select('*').eq('roadmap_id', original_id);
    if (origNodes && origNodes.length > 0) {
        const newNodes = origNodes.map(node => {
            const { id, created_at, updated_at, ...rest } = node;
            return { ...rest, roadmap_id: newRoadmapId };
        });
        await adminClient.from('roadmap_nodes').insert(newNodes);
    }

    // 4. Clone roadmap_edges
    const { data: origEdges } = await adminClient.from('roadmap_edges').select('*').eq('roadmap_id', original_id);
    if (origEdges && origEdges.length > 0) {
        const newEdges = origEdges.map(edge => {
            const { id, created_at, ...rest } = edge;
            return { ...rest, roadmap_id: newRoadmapId };
        });
        await adminClient.from('roadmap_edges').insert(newEdges);
    }

    // 5. Clone micro_topics_contents
    const { data: origTopics } = await adminClient.from('micro_topics_contents').select('*').eq('roadmap_id', original_id);
    if (origTopics && origTopics.length > 0) {
        const newTopics = origTopics.map(topic => {
            const { id, created_at, ...rest } = topic;
            return { ...rest, roadmap_id: newRoadmapId };
        });
        await adminClient.from('micro_topics_contents').insert(newTopics);
    }

    return NextResponse.json({ newId: newRoadmapId });
  } catch (err) {
    console.error("Failed to fork roadmap:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
