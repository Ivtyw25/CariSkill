import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Fetch the existing recommendations
    const { data: currentRecs } = await supabase
      .from("user_skills")
      .select("title, category")
      .eq("user_id", userId)
      .eq("status", "Recommended");
    
    if (!currentRecs || currentRecs.length === 0) {
      return NextResponse.json([]);
    }

    // Format for the frontend bubbles
    const formattedBubbles = currentRecs.map((item: any, index: number) => ({
      id: `dyn-bubble-${index}`,
      text: item.title,
      size: item.category || 'md',
    }));

    return NextResponse.json(formattedBubbles);

  } catch (error: any) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
