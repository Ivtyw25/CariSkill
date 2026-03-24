import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/community/skill-nodes/[id]
 * Fetches roadmap data for a PUBLICLY published community roadmap.
 * Nodes are not sensitive — they're just learning module titles/descriptions and are public.
 * Falls back to roadmaps.content JSON if roadmap_nodes is empty (older roadmaps).
 * User progress is fetched only when authenticated, defaulting to empty otherwise.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Only gate is: must be a published public community roadmap
    const { data: communityEntry } = await adminClient
      .from('community_roadmaps')
      .select('title')
      .eq('roadmap_id', id)
      .limit(1);

    if (!communityEntry || communityEntry.length === 0) {
      return NextResponse.json({ error: 'Roadmap not found or not public' }, { status: 404 });
    }

    // Fetch nodes, edges, and the raw roadmap content (for fallback)
    const [nodesRes, edgesRes, roadmapRes] = await Promise.all([
      adminClient.from('roadmap_nodes').select('*').eq('roadmap_id', id).order('depth_level', { ascending: true }),
      adminClient.from('roadmap_edges').select('source_node_id, target_node_id').eq('roadmap_id', id),
      adminClient.from('roadmaps').select('content, topic').eq('id', id).single(),
    ]);

    // Try to get user progress if they're authenticated (optional - defaults to empty)
    let completedNodeIds: string[] = [];
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: progressData } = await supabase
          .from('node_progress')
          .select('node_id')
          .eq('user_id', user.id)
          .eq('roadmap_id', id)
          .eq('is_completed', true);
        completedNodeIds = (progressData || []).map((p: any) => p.node_id);
      }
    } catch {
      // Not authenticated — progress defaults to empty
    }

    const topic = communityEntry[0]?.title || roadmapRes.data?.topic || 'Skill Overview';

    return NextResponse.json({
      topic,
      nodes: nodesRes.data || [],
      edges: edgesRes.data || [],
      completedNodeIds,
      // Include raw content as fallback for roadmaps without nodes in roadmap_nodes
      content: roadmapRes.data?.content || null,
    });
  } catch (err) {
    console.error('skill-nodes API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
