import { NextResponse } from "next/server";
import { analyzeSentiment, type AnalysisItem } from "@/lib/analysis";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { SAMPLE_DATASETS } from "@/lib/sample-data";

export const runtime = "nodejs";
export const maxDuration = 60;

// Realistic synthetic chat message pool — varied sentiment + emotion.
// Used to generate a fresh, varied segment chunk on each tick.
const CHAT_TEMPLATES: { author: string; text: string }[] = [
  // Positive / hype
  { author: "StreamFan_42", text: "LETS GOOO that was incredible!!!" },
  { author: "HypeBeast99", text: "THIS IS THE BEST STREAM I'VE EVER SEEN 🔥🔥" },
  { author: "HappyViewer", text: "Your energy is unmatched today, loving it!" },
  { author: "BigFan_2024", text: "Just subscribed! Best decision ever 💚" },
  { author: "CheerLeader", text: "we believe in you!!! you got this!!" },
  { author: "VibesOnly", text: "the vibes in this chat are immaculate ✨" },
  { author: "NewHere", text: "first time watching, instantly hooked!" },
  { author: "PumpedFan", text: "YESSSS finally the content we wanted" },
  { author: "GratefulViewer", text: "thanks for always showing up for us 🙏" },
  { author: "ExcitedKid", text: "no wayyyy that play was UNREAL" },
  // Neutral / factual
  { author: "QuietWatcher", text: "stream quality looks good today" },
  { author: "CasualViewer", text: "what time does the main event start?" },
  { author: "NewSub", text: "how long have you been streaming?" },
  { author: "CuriousOne", text: "what software do you use for this?" },
  { author: "TechQuestion", text: "any chance of a 4k stream option?" },
  { author: "InfoSeeker", text: "schedule for the rest of the week?" },
  { author: "RegularViewer", text: "third stream this week, keep it up" },
  { author: "PassingBy", text: "just popped in, looks interesting" },
  { author: "ChillFan", text: "watching this while working, perfect background" },
  { author: "OldTimer", text: "been here since 100 subs, crazy growth" },
  // Negative / critical
  { author: "TrollMaster", text: "skill issue tbh, that was terrible" },
  { author: "BoredViewer", text: "kinda boring today ngl, do something different" },
  { author: "CriticalOne", text: "the strategy was questionable but entertaining" },
  { author: "AngryGamer", text: "WHY DID YOU DO THAT omg so frustrating to watch" },
  { author: "Disappointed", text: "miss the old streams, content feels different now" },
  { author: "SaltyOne", text: "this is why I stopped watching regularly" },
  { author: "ImpatientFan", text: "can we move on already, this is taking forever" },
  { author: "RealTalk", text: "honestly the audio is rough today, hard to hear" },
  { author: "FrustratedUser", text: "lag is killing me, anyone else?" },
  { author: "Skeptical", text: "seems like you're just phoning it in today" },
  // Concerned / supportive
  { author: "ConcernedFan", text: "you look tired, take a break man, health first" },
  { author: "CaringViewer", text: "stay hydrated!! water breaks are important" },
  { author: "WorriedFan", text: "hope everything is ok, you seem off today" },
  { author: "LoyalFan", text: "we're here for you no matter what 💪" },
  { author: "LongTimeFan", text: "5 years watching, never missed a stream" },
  // Spam / off-topic (kept light, won't be flagged)
  { author: "SpamBot_X", text: "check out my channel guys!!!! sub4sub" },
  { author: "PromoAccount", text: "FREE GIVEAWAY click my profile!!!" },
  { author: "RandomQuestion", text: "anyone else's chat lagging?" },
  { author: "Lurker_99", text: "just lurking, enjoying the show" },
  { author: "EmojiSpam", text: "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥" },
];

const AUTHORS = [
  "NightOwl", "EarlyBird", "ChillVibes", "ProGamer", "CasualFan", "DailyWatcher",
  "WeekendWarrior", "CoffeeAddict", "StreamJunkie", "SilentBob", "LoudOne",
  "MidnightSnack", "TechSavvy", "OldSchool", "NewGenZ", "VeteranViewer",
  "CuriousCat", "RandomUser", "JustHere", "PassingThrough",
];

// Pick n deterministic-ish-random items from the chat pool, biased by
// segment number so different segments feel different but reproducible.
function pickSegmentMessages(segment: number, count: number) {
  // Linear congruential generator (LCG) for deterministic per-segment
  // pseudo-randomness. Different segments produce different shuffles.
  let state = (segment * 2654435761) % 2147483647;
  if (state === 0) state = 1;
  const rand = () => {
    state = (state * 1103515245 + 12345) % 2147483647;
    return state / 2147483647;
  };

  const pool = [...CHAT_TEMPLATES];
  // Fisher-Yates shuffle using LCG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, Math.min(count, pool.length));
  // Optionally rename some authors with random ones for variety
  return picks.map((p, idx) => {
    if (rand() < 0.33) {
      const randomAuthor = AUTHORS[Math.floor(rand() * AUTHORS.length)];
      return { ...p, author: randomAuthor };
    }
    return p;
  });
}

// Real-time-ish live stream analysis. Accepts a batch of chat messages
// and returns sentiment/emotion analysis for the segment.
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.subscriptionTier !== "PREMIUM") {
      return NextResponse.json(
        {
          error:
            "Live stream analysis is a premium feature. Apply for premium access.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { messages, segment, title, platform } = body;

    let items: AnalysisItem[] = [];

    if (messages && Array.isArray(messages) && messages.length > 0) {
      items = messages
        .filter((m: { text?: string }) => m.text && m.text.trim())
        .map((m: { text: string; author?: string }) => ({
          text: m.text,
          author: m.author,
        }));
    } else if (segment) {
      // Generate a fresh, varied synthetic chat chunk for this segment.
      // Mix in a few seeded sample items (for narrative continuity) plus
      // generated items from the broader chat template pool.
      const sample = SAMPLE_DATASETS.find(
        (s) => s.contentType === "livestream"
      );
      const seg = Number(segment) || 1;
      const chunkSize = 6 + (seg % 4); // 6–9 messages per segment
      const generated = pickSegmentMessages(seg, chunkSize);

      // Pull a couple of items from the static sample (rotating by segment)
      // to maintain narrative continuity across segments.
      const sampleStart = ((seg - 1) * 4) % (sample?.items.length || 4);
      const sampleItems = sample
        ? sample.items.slice(sampleStart, sampleStart + 2).map((it) => ({
            text: it.text,
            author: it.author,
          }))
        : [];

      items = [...sampleItems, ...generated];
    }

    if (items.length < 1) {
      return NextResponse.json(
        { error: "No messages to analyze in this segment" },
        { status: 400 }
      );
    }

    const results = await analyzeSentiment(
      items,
      platform || "youtube",
      "livestream"
    );

    return NextResponse.json({
      success: true,
      segment,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Livestream analysis error:", error);
    return NextResponse.json(
      { error: "Live stream analysis failed" },
      { status: 500 }
    );
  }
}
