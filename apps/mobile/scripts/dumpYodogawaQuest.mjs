// Usage: from apps/mobile, run
// VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/dumpYodogawaQuest.mjs
// Outputs a unified JSON of the "淀川クエスト" and its related data.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const safeSelect = async (table, builder) => {
  try {
    const query = builder(supabase.from(table));
    const { data, error } = await query;
    if (error) {
      console.warn(`Warning: ${table} fetch failed:`, error.message || error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn(`Warning: ${table} fetch failed:`, err.message || err);
    return [];
  }
};

const findYodogawaQuest = async () => {
  const { data, error } = await supabase
    .from("quests")
    .select("id, title, area_name, slug, status, created_at, description")
    .or("title.ilike.%淀川%,slug.ilike.%yodogawa%");
  if (error) {
    console.error("Failed to search quests:", error.message || error);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error("No quest matched '淀川' / 'yodogawa'.");
    process.exit(1);
  }
  const sorted = [...data].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const target = sorted[0];
  if (data.length > 1) {
    console.log("Multiple candidates found; newest will be used. Candidates:");
    data.forEach((q) =>
      console.log(
        `- ${q.id} | ${q.title} | ${q.area_name || ""} | ${q.created_at}`
      )
    );
  }
  return target;
};

const main = async () => {
  const quest = await findYodogawaQuest();
  const questId = quest.id;

  const [spots, storyTimelines, events, cases] = await Promise.all([
    safeSelect("spots", (q) => q.select("*").eq("quest_id", questId).order("order_index", { ascending: true })),
    safeSelect("story_timelines", (q) => q.select("prologue, epilogue").eq("quest_id", questId)),
    safeSelect("events", (q) => q.select("*").eq("quest_id", questId)),
    safeSelect("cases", (q) => q.select("*").eq("quest_id", questId)),
  ]);

  const dumped = {
    quest,
    events,
    cases,
    spots,
    storyTimeline: storyTimelines[0] || null,
  };

  console.dir(dumped, { depth: null, colors: true });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
