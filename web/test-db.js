const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const envVariables = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        envVariables[match[1]] = match[2].replace(/['"]/g, '');
    }
});

const supabase = createClient(envVariables.NEXT_PUBLIC_SUPABASE_URL, envVariables.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data: topics, error } = await supabase
        .from('micro_topics_contents')
        .select('*')
        .limit(1);

    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("DB keys:", Object.keys(topics[0]));
        console.log("DB topic.id:", topics[0].id);
        console.log("DB topic.node_id:", topics[0].node_id);
    }
}
test();
