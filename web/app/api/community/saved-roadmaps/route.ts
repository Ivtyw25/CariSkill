import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/community/saved-roadmaps
 * Fetches all roadmaps the currently authenticated user has saved from the community.
 * Uses admin client to read roadmap data (bypasses RLS on roadmaps table).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get user's saved roadmap IDs and their personal priorities
    const { data: savedEntries } = await adminClient
      .from('saved_roadmaps')
      .select('roadmap_id, created_at, priority')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!savedEntries || savedEntries.length === 0) {
      return NextResponse.json({ roadmaps: [] });
    }

    const savedIds = savedEntries.map((s: any) => s.roadmap_id);

    // Fetch the actual roadmap data using admin client to bypass roadmaps RLS
    // Wait, the priority should come from the user's saved_roadmaps entry, not the original roadmap.
    const { data: baseRoadmapData } = await adminClient
      .from('roadmaps')
      .select('id, topic, created_at, content')
      .in('id', savedIds);

    // Merge personal priority into the roadmap data
    const roadmapData = baseRoadmapData?.map(rm => {
      const entry = savedEntries.find((s: any) => s.roadmap_id === rm.id);
      return {
        ...rm,
        priority: entry?.priority || 2
      };
    });

    return NextResponse.json({ roadmaps: roadmapData || [] });
  } catch (err) {
    console.error('saved-roadmaps API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
