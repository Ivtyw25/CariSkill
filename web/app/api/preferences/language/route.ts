import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Admin client to bypass RLS for preference sync
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roadmapId = searchParams.get('roadmapId');

    if (!roadmapId) {
      return NextResponse.json({ error: 'Missing roadmapId' }, { status: 400 });
    }

    // Still need user client to verify identity
    const supabaseUser = await createServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[GET Pref] User: ${user.id}, Roadmap: ${roadmapId}`);

    // Use admin client to read preference
    const { data, error } = await supabaseAdmin
      .from('user_roadmap_preferences')
      .select('preferred_language')
      .eq('user_id', user.id)
      .eq('roadmap_id', roadmapId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching preferred language:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ preferred_language: data?.preferred_language || 'en' });
  } catch (err) {
    console.error('Server error during GET preference:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { roadmapId, preferredLanguage } = await request.json();

    if (!roadmapId || !preferredLanguage) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify user identity
    const supabaseUser = await createServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[POST Pref] Saving: User=${user.id}, Roadmap=${roadmapId}, Lang=${preferredLanguage}`);

    // Use admin client to bypass RLS during upsert
    const { error } = await supabaseAdmin
      .from('user_roadmap_preferences')
      .upsert({
        user_id: user.id,
        roadmap_id: roadmapId,
        preferred_language: preferredLanguage
      }, { 
        onConflict: 'user_id,roadmap_id'
      });

    if (error) {
      console.error('Supabase Admin Upsert Error:', error.message);
      return NextResponse.json({ 
        error: 'Database error', 
        message: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Server error during POST preference:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
