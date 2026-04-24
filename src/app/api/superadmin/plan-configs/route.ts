import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// In-memory cache for plan configs
let planConfigsCache: any = null;

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Try to load from Supabase first
    try {
      const { data, error } = await supabase
        .from("superadmin_settings")
        .select("plan_configs")
        .eq("key", "plan_configs")
        .single();

      if (!error && data?.plan_configs) {
        planConfigsCache = data.plan_configs;
        return NextResponse.json({ configs: data.plan_configs });
      }
    } catch (e) {
      console.log("Supabase unavailable, checking memory cache");
    }

    // Return from memory cache if available
    if (planConfigsCache) {
      return NextResponse.json({ configs: planConfigsCache });
    }

    return NextResponse.json({ configs: null });
  } catch (error) {
    console.error("Error loading plan configs:", error);
    return NextResponse.json({ configs: null });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { configs } = await request.json();
    const supabase = getSupabaseAdmin();

    // Update memory cache
    planConfigsCache = configs;

    // Try to save to Supabase
    try {
      const { data: existing } = await supabase
        .from("superadmin_settings")
        .select("id")
        .eq("key", "plan_configs")
        .single();

      if (existing) {
        await supabase
          .from("superadmin_settings")
          .update({ plan_configs: configs })
          .eq("key", "plan_configs");
      } else {
        await supabase.from("superadmin_settings").insert([
          {
            key: "plan_configs",
            plan_configs: configs,
          },
        ]);
      }
      console.log("Plan configs saved to Supabase");
    } catch (e) {
      console.log("Supabase save failed, data persists in memory cache");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving plan configs:", error);
    return NextResponse.json(
      { error: "Failed to save plan configs" },
      { status: 500 }
    );
  }
}
