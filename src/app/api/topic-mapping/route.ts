
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTopicMapping } from "@/lib/ai/topic-mapping";
import { saveTopicMap } from "@/lib/ai/save-topic-map";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createClient();

    // 1. Verify student login.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // 2. Generate topic map from uploaded materials.
    const topicMap = await generateTopicMapping();

    // 3. Save generated topics in Supabase.
    const savedTopics = await saveTopicMap(topicMap.topics);

    // 4. Return generated and saved topics.
    return NextResponse.json({
      success: true,
      topicMap,
      savedTopics,
      message: "Topic map generated and saved successfully.",
    });
  } catch (error) {
    console.error("Topic mapping failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate topic map.";

    const status = message.includes("log in") ? 401 : 500;

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}
