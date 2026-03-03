import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (data.session && !error) {
            // Check if user has completed onboarding
            if (!data.session.user.user_metadata?.field) {
                return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
            }
        }
    }

    // URL to redirect to after sign in process completes or if no code
    return NextResponse.redirect(`${requestUrl.origin}/explore`);
}
