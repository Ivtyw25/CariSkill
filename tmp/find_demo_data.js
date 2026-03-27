import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve('web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findData() {
    // 1. Find user demo@example.com
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Error listing users:', authError);
        return;
    }

    const demoUser = authUsers.users.find(u => u.email === 'demo@example.com');
    if (!demoUser) {
        console.error('User demo@example.com not found');
        return;
    }

    console.log('Demo User ID:', demoUser.id);

    // 2. Find roadmaps for this user
    const { data: roadmaps, error: roadmapError } = await supabase
        .from('user_roadmaps')
        .select('*')
        .eq('user_id', demoUser.id);

    if (roadmapError) {
        console.error('Error fetching roadmaps:', roadmapError);
        return;
    }

    console.log('Roadmaps count:', roadmaps.length);
    
    // Find roadmap with "bakery"
    const bakeryRoadmap = roadmaps.find(r => 
        JSON.stringify(r).toLowerCase().includes('bakery')
    );

    if (!bakeryRoadmap) {
        console.log('Bakery roadmap not found in user_roadmaps');
        // Let's check shared_roadmaps or similar if they exist
    } else {
        console.log('Bakery Roadmap ID:', bakeryRoadmap.id);
        // Modules are usually in a jsonb column or a separate table
        // Let's inspect the roadmap structure
    }

    // 3. Find micro_topics_contents entries
    // We'll search for "Business Idea Validation & Market Research"
    const { data: contents, error: contentsError } = await supabase
        .from('micro_topics_contents')
        .select('id, title, roadmap_id')
        .ilike('title', '%Business Idea Validation%');

    if (contentsError) {
        console.error('Error fetching contents:', contentsError);
        return;
    }

    console.log('Matching micro_topics_contents:', contents);
}

findData();
