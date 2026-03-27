const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVariables = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        envVariables[match[1]] = match[2].replace(/['"]/g, '').trim();
    }
});

const supabaseUrl = envVariables.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVariables.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetQuiz() {
    const demoUserId = 'f320299a-a5f9-41ea-97aa-fb5e6a4913c7';
    const moduleId = 'business_idea_validation';

    console.log(`Resetting ALL progress for user ${demoUserId} and module ${moduleId}...`);

    // 1. Clear Quiz Results
    const { error: quizError } = await supabase
        .from('quiz_results')
        .delete()
        .eq('user_id', demoUserId)
        .eq('node_id', moduleId);

    if (quizError) console.error('Error resetting quiz:', quizError.message);

    // 2. Clear Node Progress (Finish status)
    const { error: progressError } = await supabase
        .from('node_progress')
        .delete()
        .eq('user_id', demoUserId)
        .eq('node_id', moduleId);

    if (progressError) console.error('Error resetting progress:', progressError.message);

    // 3. Clear Study Sessions
    const { error: sessionError } = await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', demoUserId);

    if (sessionError) console.error('Error resetting sessions:', sessionError.message);

    // 4. Clear Achievements (Demo only)
    const { error: achError } = await supabase
        .from('user_achievements')
        .delete()
        .eq('user_id', demoUserId);

    if (achError) console.error('Error resetting achievements:', achError.message);

    // 5. Restore Original Material (Improvement Demo Revert)
    const originalMaterial = {
        "resources": [
            {
                "url": "https://www.marketresearchfuture.com/reports/gluten-free-bakery-market-3228",
                "type": "article",
                "title": "Gluten-free Bakery Market Research Report",
                "estimated_time_minutes": 5
            },
            {
                "url": "https://restauranteeltorreongrazalema.com/artisan-bakery-trends-that-are-taking-over-this-year/",
                "type": "article",
                "title": "Artisan Bakery Trends That Are Taking Over This Year",
                "estimated_time_minutes": 5
            }
        ],
        "difficulty": "easy",
        "topic_title": "Defining your bakery niche (e.g., artisanal bread, custom cakes, gluten-free)",
        "theory_explanation": "Imagine walking into a massive bookstore. If you're looking for a specific type of novel, say, historical fiction, you wouldn't just browse every single shelf, would you? You'd head straight to the historical fiction section. That's exactly what defining your bakery niche is all about: finding your specific section in the vast \"bakery market\" where you can truly shine and attract customers who are looking for exactly what you offer.\n\nA niche is a specialized segment of the market for a particular kind of product or service. Instead of trying to be everything to everyone, you focus on serving a particular group of customers with specific needs or preferences. This makes your marketing clearer, reduces direct competition, and allows you to become an expert in your chosen area.\n\nLet's look at some powerful examples of niches:\n\n*   **Artisanal Bread:** This niche is all about quality, tradition, and a deep appreciation for the craft of bread-making. Artisan bakeries focus on creating freshly crafted loaves using natural fermentation processes, often sourdough, and thoughtfully sourced, high-quality ingredients. Think \"clean-label\" ingredients – simple, recognizable components like stone-milled flour, filtered water, and sea salt, with natural starters instead of commercial yeast. This approach appeals to customers who value transparency, fewer preservatives, improved digestibility, and authentic, rich flavor profiles. You might even explore ancient grains, which are making a strong comeback, adding unique textures and nutritional benefits to your offerings. This niche is for those who see bread not just as food, but as an experience.\n\n*   **Gluten-Free Bakery:** This is a rapidly growing and significant niche driven by health consciousness and dietary restrictions. The market for gluten-free bakery products is experiencing robust growth, estimated at $$1.468 \\text{ USD Billion}$$ in $$2024$$ and projected to reach $$2.485 \\text{ USD Billion}$$ by $$2035$$, with a Compound Annual Growth Rate (CAGR) of $$4.9\\%$$! This isn't just a fad; it's a substantial and expanding market segment. By focusing on delicious, safe, and high-quality gluten-free options, you cater to a dedicated customer base that often struggles to find good alternatives. This could include everything from breads and pastries to cakes and cookies, all made without gluten-containing ingredients.\n\n*   **Custom Cakes:** This niche is all about celebration and personalization. Customers in this segment are looking for unique, often elaborate, cakes for special occasions like birthdays, weddings, anniversaries, or corporate events. Your expertise here would be in design, intricate decorating techniques, and working closely with clients to bring their vision to life. It's less about daily bread and more about creating edible works of art that become the centerpiece of a celebration.\n\nChoosing a niche allows you to become the go-to expert for a specific type of product, making your bakery memorable and highly appealing to your ideal customers.",
        "topic_total_time_minutes": 12
    };

    const { error: materialError } = await supabase
        .from('micro_topics_contents')
        .update({ content: originalMaterial })
        .eq('id', '01b0235e-c171-4237-b131-50a82554e23e');

    if (materialError) console.error('Error resetting material:', materialError.message);

    console.log('SUCCESS! Demo context is fully reset (Quiz, Progress, Sessions, Achievements, Materials).');
}

resetQuiz();
